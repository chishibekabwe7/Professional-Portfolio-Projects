import { Injectable } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

interface VehicleRecord {
	id: string;
	userId: number;
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
	private readonly mockVehicles: VehicleRecord[] = [
		{
			id: 'veh-001',
			userId: 1,
			category: 'truck',
			vehicleName: 'Demo Truck 1',
			plateNumber: 'ABC 1234',
			trackingEnabled: true,
		},
	];

	async createVehicle(
		userId: number,
		payload: CreateVehicleDto,
	): Promise<VehiclesServiceResult> {
		const createdVehicle: VehicleRecord = {
			id: `veh-${Date.now()}`,
			userId,
			category: payload.category,
			vehicleName: payload.vehicleName,
			plateNumber: payload.plateNumber,
			trackingEnabled: payload.trackingEnabled,
		};

		this.mockVehicles.push(createdVehicle);

		return {
			statusCode: 201,
			body: createdVehicle,
		};
	}

	async getVehicles(userId: number): Promise<VehiclesServiceResult> {
		const vehicles = this.mockVehicles.filter((vehicle) => vehicle.userId === userId);

		return {
			statusCode: 200,
			body: vehicles,
		};
	}

	async updateVehicle(
		userId: number,
		vehicleId: string,
		payload: UpdateVehicleDto,
	): Promise<VehiclesServiceResult> {
		const vehicle = this.mockVehicles.find(
			(item) => item.id === vehicleId && item.userId === userId,
		);

		if (!vehicle) {
			return {
				statusCode: 404,
				body: { message: 'Vehicle not found in mock data.' },
			};
		}

		const updatedVehicle: VehicleRecord = {
			...vehicle,
			...payload,
		};

		return {
			statusCode: 200,
			body: updatedVehicle,
		};
	}

	async deleteVehicle(
		userId: number,
		vehicleId: string,
	): Promise<VehiclesServiceResult> {
		const vehicleExists = this.mockVehicles.some(
			(item) => item.id === vehicleId && item.userId === userId,
		);

		return {
			statusCode: 200,
			body: {
				deleted: vehicleExists,
				vehicleId,
			},
		};
	}
}