import { Injectable } from '@nestjs/common';
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
			const createdVehicle = await this.prisma.vehicles.create({
				data: {
					user_id: userId,
					category: parsed.category,
					vehicle_name: parsed.vehicleName,
					plate_number: parsed.plateNumber,
					tracking_enabled: parsed.trackingEnabled,
				},
			});

			return {
				statusCode: 201,
				body: createdVehicle,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === 'P2002'
			) {
				return {
					statusCode: 409,
					body: {
						error:
							'A vehicle with this plate_number is already registered in your fleet.',
					},
				};
			}

			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async getVehicles(userId: number): Promise<VehiclesServiceResult> {
		try {
			const vehicles = await this.prisma.vehicles.findMany({
				where: { user_id: userId },
				orderBy: { created_at: 'desc' },
			});

			return {
				statusCode: 200,
				body: vehicles,
			};
		} catch (error: unknown) {
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
			const existingVehicle = await this.prisma.vehicles.findFirst({
				where: {
					id: vehicleId,
					user_id: userId,
				},
				select: { id: true },
			});

			if (!existingVehicle) {
				return {
					statusCode: 404,
					body: { error: 'Vehicle not found.' },
				};
			}

			await this.prisma.vehicles.update({
				where: { id: vehicleId },
				data: {
					category: parsed.category,
					vehicle_name: parsed.vehicleName,
					plate_number: parsed.plateNumber,
					tracking_enabled: parsed.trackingEnabled,
				},
			});

			const updatedVehicle = await this.prisma.vehicles.findFirst({
				where: {
					id: vehicleId,
					user_id: userId,
				},
			});

			return {
				statusCode: 200,
				body: updatedVehicle,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === 'P2002'
			) {
				return {
					statusCode: 409,
					body: {
						error:
							'A vehicle with this plate_number is already registered in your fleet.',
					},
				};
			}

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
			const existingVehicle = await this.prisma.vehicles.findFirst({
				where: {
					id: vehicleId,
					user_id: userId,
				},
				select: { id: true },
			});

			if (!existingVehicle) {
				return {
					statusCode: 404,
					body: { error: 'Vehicle not found.' },
				};
			}

			await this.prisma.vehicles.delete({
				where: { id: vehicleId },
			});

			return {
				statusCode: 200,
				body: { success: true },
			};
		} catch (error: unknown) {
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
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

	private getErrorMessage(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}

		return 'Unknown server error';
	}
}