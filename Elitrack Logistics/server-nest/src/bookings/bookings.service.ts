import { Injectable, Logger } from '@nestjs/common';
import { JwtTokenPayload } from '../auth/auth.service';
import {
    bookings_status,
    transactions_status,
    users_role,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingsService {
	private readonly logger = new Logger(BookingsService.name);

	constructor(private readonly prisma: PrismaService) {}

	async createBooking(
		userId: number,
		payload: CreateBookingRequest,
	): Promise<BookingsServiceResult> {
		const validationError = this.validateCreateBooking(payload);
		if (validationError) {
			return {
				statusCode: 400,
				body: { error: validationError },
			};
		}

		const vehicleId = this.toPositiveInteger(payload.vehicle_id);
		let resolvedVehicleId: number | null = null;
		let resolvedTruckType = String(payload.truck_type || '').trim();
		let resolvedTruckPrice = Number(payload.truck_price_per_day);

		try {
			if (vehicleId) {
				const vehicleRecord = await this.prisma.executeQuery(
					'BookingsService.createBooking.vehicles.findFirst',
					() =>
						this.prisma.vehicles.findFirst({
							where: {
								id: vehicleId,
								user_id: userId,
							},
							select: {
								id: true,
								category: true,
								vehicle_name: true,
							},
						}),
				);

				if (!vehicleRecord) {
					return {
						statusCode: 404,
						body: { error: 'Selected vehicle was not found in your fleet.' },
					};
				}

				resolvedVehicleId = vehicleRecord.id;
				const normalizedCategory = String(vehicleRecord.category || 'other').toLowerCase();

				resolvedTruckType = `${vehicleRecord.vehicle_name} (${normalizedCategory.toUpperCase()})`;

				if (!Number.isFinite(resolvedTruckPrice) || resolvedTruckPrice <= 0) {
					resolvedTruckPrice = CATEGORY_BASE_RATE[normalizedCategory] || CATEGORY_BASE_RATE.other;
				}
			}

			if (!resolvedTruckType) {
				return {
					statusCode: 400,
					body: { error: 'A valid vehicle selection is required.' },
				};
			}

			if (!Number.isFinite(resolvedTruckPrice) || resolvedTruckPrice <= 0) {
				return {
					statusCode: 400,
					body: { error: 'Unable to determine pricing for the selected vehicle.' },
				};
			}

			const units = Number(payload.units);
			const days = Number(payload.days);
			const securityPrice = Number(payload.security_price);
			const totalAmount = Number(payload.total_amount);
			const ref = this.generateBookingRef();
			const normalizedHub =
				String(payload.hub).toLowerCase() === 'other'
					? String(payload.manual_location || '').trim()
					: String(payload.hub);

			const createdBooking = await this.prisma.executeQuery(
				'BookingsService.createBooking.transaction',
				() =>
					this.prisma.$transaction(async (tx) => {
						const booking = await tx.bookings.create({
							data: {
								user_id: userId,
								vehicle_id: resolvedVehicleId,
								booking_ref: ref,
								truck_type: resolvedTruckType,
								truck_price_per_day: resolvedTruckPrice,
								units,
								days,
								hub: normalizedHub,
								security_tier: String(payload.security_tier),
								security_price: securityPrice,
								total_amount: totalAmount,
								notes: String(payload.notes || ''),
								status: bookings_status.pending_review,
							},
							select: {
								id: true,
							},
						});

						await tx.transactions.create({
							data: {
								booking_id: booking.id,
								user_id: userId,
								amount: totalAmount,
							},
						});

						return booking;
					}),
			);

			return {
				statusCode: 200,
				body: {
					id: createdBooking.id,
					booking_ref: ref,
				},
			};
		} catch (error: unknown) {
			this.logger.error(
				`[createBooking] Failed for userId=${userId}: ${this.getErrorMessage(error)}`,
			);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async getMyBookings(userId: number): Promise<BookingsServiceResult> {
		try {
			const rows = await this.prisma.executeQuery(
				'BookingsService.getMyBookings.bookings.findMany',
				() =>
					this.prisma.bookings.findMany({
						where: { user_id: userId },
						orderBy: { created_at: 'desc' },
					}),
			);

			return {
				statusCode: 200,
				body: rows,
			};
		} catch (error: unknown) {
			this.logger.error(
				`[getMyBookings] Failed for userId=${userId}: ${this.getErrorMessage(error)}`,
			);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async getAllBookings(user: JwtTokenPayload | undefined): Promise<BookingsServiceResult> {
		if (!this.isAdminOrSuperAdmin(user)) {
			return {
				statusCode: 403,
				body: { error: 'Forbidden' },
			};
		}

		try {
			const rows = await this.prisma.executeQuery(
				'BookingsService.getAllBookings.bookings.findMany',
				() =>
					this.prisma.bookings.findMany({
						orderBy: { created_at: 'desc' },
						include: {
							users: {
								select: {
									email: true,
									full_name: true,
									company: true,
								},
							},
						},
					}),
			);

			return {
				statusCode: 200,
				body: rows.map((row) => {
					const { users, ...booking } = row;
					return {
						...booking,
						email: users.email,
						full_name: users.full_name,
						company: users.company,
					};
				}),
			};
		} catch (error: unknown) {
			this.logger.error(`[getAllBookings] Failed: ${this.getErrorMessage(error)}`);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async updateBookingStatus(
		user: JwtTokenPayload | undefined,
		bookingIdParam: string,
		payload: UpdateBookingStatusRequest,
	): Promise<BookingsServiceResult> {
		if (!this.isAdminOrSuperAdmin(user)) {
			return {
				statusCode: 403,
				body: { error: 'Forbidden' },
			};
		}

		const bookingId = this.toPositiveInteger(bookingIdParam);
		if (!bookingId) {
			return {
				statusCode: 400,
				body: { error: 'Invalid booking id.' },
			};
		}

		const requestedStatus = this.normalizeWorkflowStatus(payload.status);
		const dispatcherName = String(payload.dispatcher_name || '').trim();
		const statusNotes = String(payload.status_notes || '').trim();
		const etaRaw = payload.eta;
		const eta = etaRaw ? new Date(String(etaRaw)) : null;

		if (!requestedStatus) {
			return {
				statusCode: 400,
				body: { error: 'Invalid status value.' },
			};
		}

		if (['dispatched', 'in_transit'].includes(requestedStatus)) {
			if (!dispatcherName) {
				return {
					statusCode: 400,
					body: { error: 'dispatcher_name is required for dispatched/in_transit status.' },
				};
			}

			if (!etaRaw || !eta || Number.isNaN(eta.getTime())) {
				return {
					statusCode: 400,
					body: { error: 'eta is required for dispatched/in_transit status.' },
				};
			}
		}

		try {
			const currentBooking = await this.prisma.executeQuery(
				'BookingsService.updateBookingStatus.bookings.findUnique',
				() =>
					this.prisma.bookings.findUnique({
						where: { id: bookingId },
						select: { status: true },
					}),
			);

			if (!currentBooking) {
				return {
					statusCode: 404,
					body: { error: 'Booking not found.' },
				};
			}

			const currentStatus = this.normalizeWorkflowStatus(currentBooking.status);
			if (!currentStatus) {
				return {
					statusCode: 400,
					body: { error: 'Invalid current booking status.' },
				};
			}

			const allowedTransitions = ALLOWED_TRANSITIONS[currentStatus];
			if (
				currentStatus !== requestedStatus &&
				!allowedTransitions.includes(requestedStatus)
			) {
				return {
					statusCode: 400,
					body: {
						error: `Invalid transition from ${currentStatus} to ${requestedStatus}.`,
					},
				};
			}

			await this.prisma.executeQuery(
				'BookingsService.updateBookingStatus.transaction',
				() =>
					this.prisma.$transaction(async (tx) => {
						await tx.bookings.update({
							where: { id: bookingId },
							data: {
								status: requestedStatus,
								dispatcher_name: dispatcherName || null,
								eta: eta || null,
								status_notes: statusNotes || null,
							},
						});

						if (user?.id) {
							await tx.audit_logs
								.create({
									data: {
										user_id: user.id,
										action: 'status_change',
										target_id: bookingId,
									},
								})
								.catch(() => {
									// Keep status update successful even if audit log write fails.
								});
						}
					}),
			);

			return {
				statusCode: 200,
				body: {
					success: true,
					status: requestedStatus,
				},
			};
		} catch (error: unknown) {
			this.logger.error(
				`[updateBookingStatus] Failed for bookingId=${bookingId}: ${this.getErrorMessage(error)}`,
			);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async updatePaymentStatus(
		user: JwtTokenPayload | undefined,
		bookingIdParam: string,
		payload: UpdateBookingPaymentRequest,
	): Promise<BookingsServiceResult> {
		const userId = user?.id;
		if (!userId) {
			return {
				statusCode: 403,
				body: { error: 'Admins only' },
			};
		}

		const isAdmin = await this.hasAdminRoleInDatabase(userId);
		if (!isAdmin) {
			return {
				statusCode: 403,
				body: { error: 'Admins only' },
			};
		}

		const bookingId = this.toPositiveInteger(bookingIdParam);
		if (!bookingId) {
			return {
				statusCode: 400,
				body: { error: 'Invalid booking id.' },
			};
		}

		const statusRaw = String(payload.status || '').trim().toLowerCase();
		if (!ALLOWED_PAYMENT_STATUSES.includes(statusRaw as PaymentStatus)) {
			return {
				statusCode: 400,
				body: { error: 'Invalid payment status.' },
			};
		}

		const status = statusRaw as PaymentStatus;

		try {
			await this.prisma.executeQuery(
				'BookingsService.updatePaymentStatus.transactions.updateMany',
				() =>
					this.prisma.transactions.updateMany({
						where: { booking_id: bookingId },
						data: {
							status,
							payment_method: payload.payment_method || null,
						},
					}),
			);

			return {
				statusCode: 200,
				body: { success: true },
			};
		} catch (error: unknown) {
			this.logger.error(
				`[updatePaymentStatus] Failed for bookingId=${bookingId}: ${this.getErrorMessage(error)}`,
			);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	private validateCreateBooking(payload: CreateBookingRequest): string | null {
		const {
			vehicle_id,
			truck_type,
			truck_price_per_day,
			units,
			days,
			hub,
			manual_location,
			security_tier,
			security_price,
			total_amount,
		} = payload;

		if (!hub || !security_tier) {
			return 'Missing required booking fields.';
		}

		if (!vehicle_id && !truck_type) {
			return 'vehicle_id is required for fleet bookings.';
		}

		if ([units, days, security_price, total_amount].some((value) => Number.isNaN(Number(value)))) {
			return 'Booking numeric fields must be valid numbers.';
		}

		if (
			typeof truck_price_per_day !== 'undefined' &&
			Number.isNaN(Number(truck_price_per_day))
		) {
			return 'truck_price_per_day must be a valid number when provided.';
		}

		if (vehicle_id && !this.toPositiveInteger(vehicle_id)) {
			return 'vehicle_id must be a positive integer.';
		}

		if (Number(units) < 1 || Number(days) < 1) {
			return 'units and days must be >= 1.';
		}

		if (
			String(hub).toLowerCase() === 'other' &&
			!String(manual_location || '').trim()
		) {
			return 'manual_location is required when hub is Other.';
		}

		return null;
	}

	private isAdminOrSuperAdmin(user: JwtTokenPayload | undefined): boolean {
		return (
			user?.role === users_role.admin ||
			user?.role === users_role.super_admin
		);
	}

	private async hasAdminRoleInDatabase(userId: number): Promise<boolean> {
		try {
			const user = await this.prisma.executeQuery(
				'BookingsService.hasAdminRoleInDatabase.users.findUnique',
				() =>
					this.prisma.users.findUnique({
						where: { id: userId },
						select: { role: true },
					}),
			);

			if (!user) {
				return false;
			}

			return (
				user.role === users_role.admin ||
				user.role === users_role.super_admin
			);
		} catch {
			return false;
		}
	}

	private normalizeWorkflowStatus(input: unknown): WorkflowStatus | null {
		const normalized = String(input || '').trim().toLowerCase();
		const mapped = LEGACY_STATUS_MAP[normalized] || normalized;

		if (!WORKFLOW_STATUSES.includes(mapped as WorkflowStatus)) {
			return null;
		}

		return mapped as WorkflowStatus;
	}

	private toPositiveInteger(value: unknown): number | null {
		const numberValue = Number(value);

		if (!Number.isInteger(numberValue) || numberValue <= 0) {
			return null;
		}

		return numberValue;
	}

	private generateBookingRef(): string {
		return `TL-${Date.now().toString(36).toUpperCase()}`;
	}

	private getErrorMessage(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}

		return 'Unknown server error';
	}
}

export interface BookingsServiceResult {
	statusCode: number;
	body: unknown;
}

export interface CreateBookingRequest {
	vehicle_id?: number | string;
	truck_type?: string;
	truck_price_per_day?: number | string;
	units?: number | string;
	days?: number | string;
	hub?: string;
	manual_location?: string;
	security_tier?: string;
	security_price?: number | string;
	total_amount?: number | string;
	notes?: string;
}

export interface UpdateBookingStatusRequest {
	status?: string;
	dispatcher_name?: string;
	eta?: string | null;
	status_notes?: string;
}

export interface UpdateBookingPaymentRequest {
	status?: string;
	payment_method?: string;
}

type WorkflowStatus =
	| 'pending_review'
	| 'approved'
	| 'dispatched'
	| 'in_transit'
	| 'completed';

const WORKFLOW_STATUSES: WorkflowStatus[] = [
	'pending_review',
	'approved',
	'dispatched',
	'in_transit',
	'completed',
];

const LEGACY_STATUS_MAP: Record<string, WorkflowStatus> = {
	pending: 'pending_review',
	active: 'in_transit',
};

const ALLOWED_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
	pending_review: ['approved'],
	approved: ['dispatched'],
	dispatched: ['in_transit'],
	in_transit: ['completed'],
	completed: [],
};

const ALLOWED_PAYMENT_STATUSES = [
	transactions_status.pending,
	transactions_status.paid,
	transactions_status.failed,
	transactions_status.refunded,
] as const;

type PaymentStatus = (typeof ALLOWED_PAYMENT_STATUSES)[number];

const CATEGORY_BASE_RATE: Record<string, number> = {
	truck: 11500,
	van: 7000,
	suv: 5500,
	motorbike: 2500,
	other: 4500,
};