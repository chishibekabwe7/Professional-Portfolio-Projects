import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Req,
    Res,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { JwtTokenPayload } from '../auth/auth.service';
import {
    BookingsService,
    CreateBookingRequest,
    UpdateBookingPaymentRequest,
    UpdateBookingStatusRequest,
} from './bookings.service';

interface AuthenticatedRequest {
	user?: JwtTokenPayload;
}

@Controller('bookings')
@UseGuards(AuthGuard)
export class BookingsController {
	constructor(private readonly bookingsService: BookingsService) {}

	@Post()
	async createBooking(
		@Req() req: AuthenticatedRequest,
		@Body() body: CreateBookingRequest,
		@Res() res: Response,
	): Promise<void> {
		const userId = this.getUserId(req);
		const result = await this.bookingsService.createBooking(userId, body);
		res.status(result.statusCode).json(result.body);
	}

	@Get('mine')
	async getMyBookings(
		@Req() req: AuthenticatedRequest,
		@Res() res: Response,
	): Promise<void> {
		const userId = this.getUserId(req);
		const result = await this.bookingsService.getMyBookings(userId);
		res.status(result.statusCode).json(result.body);
	}

	@Get('all')
	async getAllBookings(
		@Req() req: AuthenticatedRequest,
		@Res() res: Response,
	): Promise<void> {
		const result = await this.bookingsService.getAllBookings(req.user);
		res.status(result.statusCode).json(result.body);
	}

	@Patch(':id/status')
	async updateBookingStatus(
		@Req() req: AuthenticatedRequest,
		@Param('id') id: string,
		@Body() body: UpdateBookingStatusRequest,
		@Res() res: Response,
	): Promise<void> {
		const result = await this.bookingsService.updateBookingStatus(req.user, id, body);
		res.status(result.statusCode).json(result.body);
	}

	@Patch(':id/payment')
	async updateBookingPayment(
		@Req() req: AuthenticatedRequest,
		@Param('id') id: string,
		@Body() body: UpdateBookingPaymentRequest,
		@Res() res: Response,
	): Promise<void> {
		const result = await this.bookingsService.updatePaymentStatus(req.user, id, body);
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