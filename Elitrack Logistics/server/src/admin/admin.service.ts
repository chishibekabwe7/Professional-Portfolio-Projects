import { Injectable, Logger } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { JwtTokenPayload } from '../auth/auth.service';
import {
    bookings_status,
    transactions_status,
    users_role,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

const SALT_ROUNDS = 12;
const DEFAULT_SUPER_ADMIN_EMAIL = 'chishibekabwe7@gmail.com';

export interface AdminServiceResult {
	statusCode: number;
	body: unknown;
}

export interface CreateAdminRequest {
	email?: string;
	password?: string;
	full_name?: string;
	company?: string;
	phone?: string;
}

@Injectable()
export class AdminService {
	private readonly logger = new Logger(AdminService.name);

	constructor(private readonly prisma: PrismaService) {}

	async getSeededUsersChecklist(): Promise<AdminServiceResult> {
		const appEnv = process.env.NODE_ENV || 'development';
		if (appEnv !== 'development') {
			return {
				statusCode: 404,
				body: { error: 'Not found' },
			};
		}

		try {
			const [
				totalUsers,
				superAdminCount,
				adminCount,
				userCount,
				usersWithoutPasswordRows,
				defaultSuperAdmin,
				recentUsers,
			] = await Promise.all([
				this.prisma.executeQuery(
					'AdminService.getSeededUsersChecklist.users.count.total',
					() => this.prisma.users.count(),
				),
				this.prisma.executeQuery(
					'AdminService.getSeededUsersChecklist.users.count.super_admin',
					() => this.prisma.users.count({ where: { role: users_role.super_admin } }),
				),
				this.prisma.executeQuery(
					'AdminService.getSeededUsersChecklist.users.count.admin',
					() => this.prisma.users.count({ where: { role: users_role.admin } }),
				),
				this.prisma.executeQuery(
					'AdminService.getSeededUsersChecklist.users.count.user',
					() => this.prisma.users.count({ where: { role: users_role.user } }),
				),
				this.prisma.executeQuery(
					'AdminService.getSeededUsersChecklist.usersWithoutPassword.queryRaw',
					() =>
						this.prisma.$queryRaw<
							Array<{ users_without_password_count: bigint | number | null }>
						>`SELECT COUNT(*) AS users_without_password_count FROM users WHERE password IS NULL OR password = ''`,
				),
				this.prisma.executeQuery(
					'AdminService.getSeededUsersChecklist.users.findUnique.defaultSuperAdmin',
					() =>
						this.prisma.users.findUnique({
							where: { email: DEFAULT_SUPER_ADMIN_EMAIL },
							select: {
								id: true,
								email: true,
								role: true,
								created_at: true,
							},
						}),
				),
				this.prisma.executeQuery(
					'AdminService.getSeededUsersChecklist.users.findMany.recentUsers',
					() =>
						this.prisma.users.findMany({
							orderBy: { created_at: 'desc' },
							take: 10,
							select: {
								id: true,
								email: true,
								role: true,
								created_at: true,
							},
						}),
				),
			]);

			const usersWithoutPasswordCount = this.toNumber(
				usersWithoutPasswordRows[0]?.users_without_password_count,
			);

			return {
				statusCode: 200,
				body: {
					environment: appEnv,
					role_model: ['super_admin', 'admin', 'user'],
					default_super_admin: {
						email: DEFAULT_SUPER_ADMIN_EMAIL,
						exists: Boolean(defaultSuperAdmin),
						id: defaultSuperAdmin?.id || null,
						note: 'Default password is configured in server config bootstrap logic.',
					},
					checklist: {
						total_users: totalUsers,
						super_admin_count: superAdminCount,
						admin_count: adminCount,
						user_count: userCount,
						users_without_password_count: usersWithoutPasswordCount,
						all_users_have_password_hash: usersWithoutPasswordCount === 0,
						has_exactly_one_super_admin: superAdminCount === 1,
					},
					recent_users: recentUsers,
				},
			};
		} catch (error: unknown) {
			this.logger.error(
				`[getSeededUsersChecklist] Failed: ${this.getErrorMessage(error)}`,
			);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async getStats(): Promise<AdminServiceResult> {
		try {
			const [totalUsers, totalBookings, activeBookings, paidRevenue, pendingRevenue] =
				await Promise.all([
					this.prisma.executeQuery('AdminService.getStats.users.count', () =>
						this.prisma.users.count({
							where: { role: users_role.user },
						}),
					),
					this.prisma.executeQuery('AdminService.getStats.bookings.count.total', () =>
						this.prisma.bookings.count(),
					),
					this.prisma.executeQuery('AdminService.getStats.bookings.count.active', () =>
						this.prisma.bookings.count({
							where: {
								status: {
									in: [
										bookings_status.approved,
										bookings_status.dispatched,
										bookings_status.in_transit,
									],
								},
							},
						}),
					),
					this.prisma.executeQuery(
						'AdminService.getStats.transactions.aggregate.totalRevenue',
						() =>
							this.prisma.transactions.aggregate({
								where: { status: transactions_status.paid },
								_sum: { amount: true },
							}),
					),
					this.prisma.executeQuery(
						'AdminService.getStats.transactions.aggregate.pendingRevenue',
						() =>
							this.prisma.transactions.aggregate({
								where: { status: transactions_status.pending },
								_sum: { amount: true },
							}),
					),
				]);

			return {
				statusCode: 200,
				body: {
					total_users: totalUsers,
					total_bookings: totalBookings,
					active_bookings: activeBookings,
					total_revenue: paidRevenue._sum.amount || 0,
					pending_revenue: pendingRevenue._sum.amount || 0,
				},
			};
		} catch (error: unknown) {
			this.logger.error(`[getStats] Failed: ${this.getErrorMessage(error)}`);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async getUsers(): Promise<AdminServiceResult> {
		try {
			const users = await this.prisma.executeQuery(
				'AdminService.getUsers.users.findMany',
				() =>
					this.prisma.users.findMany({
						orderBy: { created_at: 'desc' },
						select: {
							id: true,
							email: true,
							phone: true,
							full_name: true,
							company: true,
							role: true,
							created_at: true,
						},
					}),
			);

			return {
				statusCode: 200,
				body: users,
			};
		} catch (error: unknown) {
			this.logger.error(`[getUsers] Failed: ${this.getErrorMessage(error)}`);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async createAdmin(payload: CreateAdminRequest): Promise<AdminServiceResult> {
		const email = String(payload.email || '').trim();
		const password = String(payload.password || '');

		if (!email || !password) {
			return {
				statusCode: 400,
				body: { error: 'email and password are required.' },
			};
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return {
				statusCode: 400,
				body: { error: 'Invalid email format.' },
			};
		}

		if (password.length < 8) {
			return {
				statusCode: 400,
				body: { error: 'Password must be at least 8 characters.' },
			};
		}

		try {
			const existingUser = await this.prisma.executeQuery(
				'AdminService.createAdmin.users.findUnique.email',
				() =>
					this.prisma.users.findUnique({
						where: { email },
						select: { id: true },
					}),
			);

			if (existingUser) {
				return {
					statusCode: 409,
					body: { error: 'A user with that email already exists.' },
				};
			}

			const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
			const created = await this.prisma.executeQuery(
				'AdminService.createAdmin.users.create',
				() =>
					this.prisma.users.create({
						data: {
							email,
							password: hashedPassword,
							role: users_role.admin,
							full_name: payload.full_name || null,
							company: payload.company || null,
							phone: payload.phone || null,
						},
						select: {
							id: true,
							email: true,
							role: true,
						},
					}),
			);

			return {
				statusCode: 201,
				body: {
					message: 'Admin account created.',
					id: created.id,
					email: created.email,
					role: created.role,
				},
			};
		} catch (error: unknown) {
			this.logger.error(`[createAdmin] Failed: ${this.getErrorMessage(error)}`);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async removeUser(
		requester: JwtTokenPayload | undefined,
		userIdParam: string,
	): Promise<AdminServiceResult> {
		const targetId = this.toPositiveInteger(userIdParam);

		if (!targetId) {
			return {
				statusCode: 400,
				body: { error: 'Invalid user id.' },
			};
		}

		if (!requester?.id || !requester.role) {
			return {
				statusCode: 401,
				body: { error: 'Unauthorized' },
			};
		}

		try {
			const targetUser = await this.prisma.executeQuery(
				'AdminService.removeUser.users.findUnique.target',
				() =>
					this.prisma.users.findUnique({
						where: { id: targetId },
						select: {
							id: true,
							role: true,
						},
					}),
			);

			if (!targetUser) {
				return {
					statusCode: 404,
					body: { error: 'User not found.' },
				};
			}

			if (targetUser.id === requester.id) {
				return {
					statusCode: 400,
					body: { error: 'You cannot delete your own account.' },
				};
			}

			const targetIsAdmin =
				targetUser.role === users_role.admin ||
				targetUser.role === users_role.super_admin;

			if (targetIsAdmin && requester.role !== users_role.super_admin) {
				return {
					statusCode: 403,
					body: {
						error: 'Only a super_admin can remove another admin account.',
					},
				};
			}

			await this.prisma.executeQuery('AdminService.removeUser.users.delete', () =>
				this.prisma.users.delete({
					where: { id: targetId },
				}),
			);

			return {
				statusCode: 200,
				body: { message: 'User removed successfully.' },
			};
		} catch (error: unknown) {
			this.logger.error(`[removeUser] Failed: ${this.getErrorMessage(error)}`);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async getTransactions(): Promise<AdminServiceResult> {
		try {
			const rows = await this.prisma.executeQuery(
				'AdminService.getTransactions.transactions.findMany',
				() =>
					this.prisma.transactions.findMany({
						orderBy: { created_at: 'desc' },
						include: {
							bookings: {
								select: {
									booking_ref: true,
									truck_type: true,
									hub: true,
								},
							},
							users: {
								select: {
									email: true,
									full_name: true,
								},
							},
						},
					}),
			);

			return {
				statusCode: 200,
				body: rows.map((row) => {
					const { bookings, users, ...transaction } = row;
					return {
						...transaction,
						booking_ref: bookings.booking_ref,
						truck_type: bookings.truck_type,
						hub: bookings.hub,
						email: users.email,
						full_name: users.full_name,
					};
				}),
			};
		} catch (error: unknown) {
			this.logger.error(`[getTransactions] Failed: ${this.getErrorMessage(error)}`);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async getNotifications(): Promise<AdminServiceResult> {
		try {
			const rows = await this.prisma.executeQuery(
				'AdminService.getNotifications.notification_events.findMany',
				() =>
					this.prisma.notification_events.findMany({
						orderBy: { created_at: 'desc' },
						take: 300,
						include: {
							bookings: {
								select: {
									booking_ref: true,
								},
							},
							users: {
								select: {
									email: true,
									full_name: true,
								},
							},
						},
					}),
			);

			return {
				statusCode: 200,
				body: rows.map((row) => {
					const { bookings, users, ...notification } = row;
					return {
						...notification,
						booking_ref: bookings?.booking_ref || null,
						email: users?.email || null,
						full_name: users?.full_name || null,
					};
				}),
			};
		} catch (error: unknown) {
			this.logger.error(`[getNotifications] Failed: ${this.getErrorMessage(error)}`);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async getAuditLogs(): Promise<AdminServiceResult> {
		try {
			const rows = await this.prisma.executeQuery(
				'AdminService.getAuditLogs.admin_audit_logs.findMany',
				() =>
					this.prisma.admin_audit_logs.findMany({
						orderBy: { created_at: 'desc' },
						take: 300,
						include: {
							users: {
								select: {
									email: true,
									full_name: true,
								},
							},
						},
					}),
			);

			return {
				statusCode: 200,
				body: rows.map((row) => {
					const { users, ...auditLog } = row;
					return {
						...auditLog,
						admin_email: users.email,
						admin_name: users.full_name,
					};
				}),
			};
		} catch (error: unknown) {
			this.logger.error(`[getAuditLogs] Failed: ${this.getErrorMessage(error)}`);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	private toPositiveInteger(value: unknown): number | null {
		const parsed = Number(value);
		if (!Number.isInteger(parsed) || parsed <= 0) {
			return null;
		}

		return parsed;
	}

	private toNumber(value: unknown): number {
		if (typeof value === 'number') {
			return value;
		}

		if (typeof value === 'bigint') {
			return Number(value);
		}

		if (typeof value === 'string') {
			const parsed = Number(value);
			return Number.isNaN(parsed) ? 0 : parsed;
		}

		return 0;
	}

	private getErrorMessage(error: unknown): string {
		if (error instanceof Error && error.message) {
			return error.message;
		}

		return 'Unknown error';
	}
}