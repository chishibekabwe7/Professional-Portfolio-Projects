import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Req,
    Res,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { JwtTokenPayload } from '../auth/auth.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

interface AuthenticatedRequest {
	user?: JwtTokenPayload;
}

@Controller('vehicles')
@UseGuards(AuthGuard)
export class VehiclesController {
	constructor(private readonly vehiclesService: VehiclesService) {}

	@Post()
	async createVehicle(
		@Req() req: AuthenticatedRequest,
		@Body() body: CreateVehicleDto,
		@Res() res: Response,
	): Promise<void> {
		const userId = this.getUserId(req);
		const result = await this.vehiclesService.createVehicle(userId, body);
		res.status(result.statusCode).json(result.body);
	}

	@Get()
	async getVehicles(
		@Req() req: AuthenticatedRequest,
		@Res() res: Response,
	): Promise<void> {
		const userId = this.getUserId(req);
		const result = await this.vehiclesService.getVehicles(userId);
		res.status(result.statusCode).json(result.body);
	}

	@Put(':id')
	async updateVehicle(
		@Req() req: AuthenticatedRequest,
		@Param('id') id: string,
		@Body() body: UpdateVehicleDto,
		@Res() res: Response,
	): Promise<void> {
		const userId = this.getUserId(req);
		const result = await this.vehiclesService.updateVehicle(userId, id, body);
		res.status(result.statusCode).json(result.body);
	}

	@Delete(':id')
	async deleteVehicle(
		@Req() req: AuthenticatedRequest,
		@Param('id') id: string,
		@Res() res: Response,
	): Promise<void> {
		const userId = this.getUserId(req);
		const result = await this.vehiclesService.deleteVehicle(userId, id);
		res.status(result.statusCode).json(result.body);
	}

	private getUserId(req: AuthenticatedRequest): number {
		const userId = req.user?.id;

		if (!userId) {
			throw new UnauthorizedException('Unauthorized');
		}

		return userId;
	}
}