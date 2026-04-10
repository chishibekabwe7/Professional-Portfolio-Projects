import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

const DEFAULT_CATEGORY = 'other';

interface ParsedVehiclePayload {
	category: string;
	vehicleName: string;
	plateNumber: string;
	trackingEnabled: boolean;
}

export interface VehiclesServiceResult {
	statusCode: number;
	body: unknown;
}

@Injectable()
export class VehiclesService {
	private readonly logger = new Logger(VehiclesService.name);

	constructor(private readonly prisma: PrismaService) {}

	async createVehicle(
		userId: number,
		payload: CreateVehicleDto,
	): Promise<VehiclesServiceResult> {
		const parsed = this.parseVehiclePayload(payload);
		if ('error' in parsed) {
			return {
				statusCode: 400,
				body: { error: parsed.error },
			};
		}

		try {
			this.logger.log(`[createVehicle] userId=${userId} starting create`);
			const createdVehicle = await this.prisma.executeQuery(
				'VehiclesService.createVehicle.vehicles.create',
				() =>
					this.prisma.vehicles.create({
						data: {
							user_id: userId,
							category: parsed.category,
							vehicle_name: parsed.vehicleName,
							plate_number: parsed.plateNumber,
							tracking_enabled: parsed.trackingEnabled,
						},
					}),
			);
			this.logger.log(
				`[createVehicle] userId=${userId} created vehicleId=${createdVehicle.id}`,
			);

			return {
				statusCode: 201,
				body: createdVehicle,
			};
		} catch (error: unknown) {
			if (this.isUniquePlateConstraintError(error)) {
				this.logger.warn(
					`[createVehicle] Duplicate plate for userId=${userId}: ${parsed.plateNumber}`,
				);
				return {
					statusCode: 409,
					body: {
						error:
							'A vehicle with this plate_number is already registered in your fleet.',
					},
				};
			}

			this.logger.error(
				`[createVehicle] Failed for userId=${userId}: ${this.getErrorMessage(error)}`,
			);

			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async getVehicles(userId: number): Promise<VehiclesServiceResult> {
		try {
			this.logger.log(`[getVehicles] userId=${userId} loading vehicles`);
			const vehicles = await this.prisma.executeQuery(
				'VehiclesService.getVehicles.vehicles.findMany',
				() =>
					this.prisma.vehicles.findMany({
						where: { user_id: userId },
						orderBy: { created_at: 'desc' },
					}),
			);
			this.logger.log(`[getVehicles] userId=${userId} loaded ${vehicles.length} vehicles`);

			return {
				statusCode: 200,
				body: vehicles,
			};
		} catch (error: unknown) {
			this.logger.error(
				`[getVehicles] Failed for userId=${userId}: ${this.getErrorMessage(error)}`,
			);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async updateVehicle(
		userId: number,
		vehicleIdParam: string,
		payload: UpdateVehicleDto,
	): Promise<VehiclesServiceResult> {
		const vehicleId = Number(vehicleIdParam);
		if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
			return {
				statusCode: 400,
				body: { error: 'Invalid vehicle id.' },
			};
		}

		const parsed = this.parseVehiclePayload(payload);
		if ('error' in parsed) {
			return {
				statusCode: 400,
				body: { error: parsed.error },
			};
		}

		try {
			const accessError = await this.validateVehicleOwnership(vehicleId, userId);
			if (accessError) {
				return accessError;
			}

			this.logger.log(
				`[updateVehicle] userId=${userId} updating vehicleId=${vehicleId}`,
			);
			const updatedVehicle = await this.prisma.executeQuery(
				'VehiclesService.updateVehicle.vehicles.update',
				() =>
					this.prisma.vehicles.update({
						where: { id: vehicleId },
						data: {
							category: parsed.category,
							vehicle_name: parsed.vehicleName,
							plate_number: parsed.plateNumber,
							tracking_enabled: parsed.trackingEnabled,
						},
					}),
			);
			this.logger.log(
				`[updateVehicle] userId=${userId} updated vehicleId=${vehicleId}`,
			);

			return {
				statusCode: 200,
				body: updatedVehicle,
			};
		} catch (error: unknown) {
			if (this.isUniquePlateConstraintError(error)) {
				this.logger.warn(
					`[updateVehicle] Duplicate plate for userId=${userId}: ${parsed.plateNumber}`,
				);
				return {
					statusCode: 409,
					body: {
						error:
							'A vehicle with this plate_number is already registered in your fleet.',
					},
				};
			}

			this.logger.error(
				`[updateVehicle] Failed for userId=${userId}, vehicleId=${vehicleId}: ${this.getErrorMessage(
					error,
				)}`,
			);

			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async deleteVehicle(
		userId: number,
		vehicleIdParam: string,
	): Promise<VehiclesServiceResult> {
		const vehicleId = Number(vehicleIdParam);
		if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
			return {
				statusCode: 400,
				body: { error: 'Invalid vehicle id.' },
			};
		}

		try {
			const accessError = await this.validateVehicleOwnership(vehicleId, userId);
			if (accessError) {
				return accessError;
			}

			this.logger.log(
				`[deleteVehicle] userId=${userId} deleting vehicleId=${vehicleId}`,
			);
			await this.prisma.executeQuery(
				'VehiclesService.deleteVehicle.vehicles.delete',
				() =>
					this.prisma.vehicles.delete({
						where: { id: vehicleId },
					}),
			);
			this.logger.log(
				`[deleteVehicle] userId=${userId} deleted vehicleId=${vehicleId}`,
			);

			return {
				statusCode: 200,
				body: { success: true },
			};
		} catch (error: unknown) {
			this.logger.error(
				`[deleteVehicle] Failed for userId=${userId}, vehicleId=${vehicleId}: ${this.getErrorMessage(
					error,
				)}`,
			);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	private async validateVehicleOwnership(
		vehicleId: number,
		userId: number,
	): Promise<VehiclesServiceResult | null> {
		const vehicle = await this.prisma.executeQuery(
			'VehiclesService.validateVehicleOwnership.vehicles.findUnique',
			() =>
				this.prisma.vehicles.findUnique({
					where: { id: vehicleId },
					select: {
						id: true,
						user_id: true,
					},
				}),
		);

		if (!vehicle) {
			return {
				statusCode: 404,
				body: { error: 'Vehicle not found.' },
			};
		}

		if (vehicle.user_id !== userId) {
			return {
				statusCode: 403,
				body: { error: 'Unauthorized vehicle access.' },
			};
		}

		return null;
	}

	private parseVehiclePayload(
		payload: CreateVehicleDto | UpdateVehicleDto,
	): ParsedVehiclePayload | { error: string } {
		const category = this.normalizeCategory(payload.category, payload.custom_category);
		const vehicleName = String(payload.vehicle_name || '').trim();
		const plateNumber = this.normalizePlate(payload.plate_number);
		const trackingEnabled = this.toBoolean(payload.tracking_enabled, true);

		if (!vehicleName) {
			return { error: 'vehicle_name is required.' };
		}

		if (!plateNumber) {
			return { error: 'plate_number is required.' };
		}

		if (vehicleName.length > 120) {
			return { error: 'vehicle_name must be 120 characters or fewer.' };
		}

		if (plateNumber.length > 30) {
			return { error: 'plate_number must be 30 characters or fewer.' };
		}

		if (category.length > 60) {
			return { error: 'category must be 60 characters or fewer.' };
		}

		return {
			category,
			vehicleName,
			plateNumber,
			trackingEnabled,
		};
	}

	private normalizeCategory(category?: string, customCategory?: string): string {
		const normalized = String(category || '').trim().toLowerCase();

		if (!normalized) return DEFAULT_CATEGORY;
		if (normalized !== DEFAULT_CATEGORY) return normalized;

		const custom = String(customCategory || '').trim().toLowerCase();
		return custom || DEFAULT_CATEGORY;
	}

	private normalizePlate(plateNumber?: string): string {
		return String(plateNumber || '').trim().toUpperCase();
	}

	private toBoolean(value: unknown, fallback = true): boolean {
		if (typeof value === 'boolean') return value;
		if (typeof value === 'number') return value === 1;

		if (typeof value === 'string') {
			const normalized = value.trim().toLowerCase();
			if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
			if (['false', '0', 'no', 'off'].includes(normalized)) return false;
		}

		return fallback;
	}

	private isUniquePlateConstraintError(error: unknown): boolean {
		return (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002'
		);
	}

	private getErrorMessage(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}

		return 'Unknown server error';
	}
}