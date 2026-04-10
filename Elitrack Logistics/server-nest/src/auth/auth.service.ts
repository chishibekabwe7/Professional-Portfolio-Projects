import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { Prisma } from '../generated/prisma/client';
import { users_role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleOAuthStrategy } from './google-oauth.strategy';

export interface RegisterRequest {
	email?: string;
	password?: string;
	phone?: string;
	full_name?: string;
	company?: string;
}

export interface LoginRequest {
	email?: string;
	password?: string;
}

export interface GoogleAuthRequest {
	token?: string;
}

export interface JwtTokenPayload {
	id: number;
	email: string;
	role: 'super_admin' | 'admin' | 'user';
}

export interface AuthServiceResult {
	statusCode: number;
	body: unknown;
}

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(
		private readonly jwtService: JwtService,
		private readonly prisma: PrismaService,
		private readonly googleOAuthStrategy: GoogleOAuthStrategy,
	) {}

	async register(payload: RegisterRequest): Promise<AuthServiceResult> {
		const registerValidationError = this.validateRegister(payload);
		if (registerValidationError) {
			return {
				statusCode: 400,
				body: { error: registerValidationError },
			};
		}

		const email = String(payload.email);
		const password = String(payload.password);

		try {
			this.logger.log(`[register] Preparing user creation for ${email}`);
			const hashedPassword = await bcrypt.hash(password, 12);
			await this.prisma.executeQuery('AuthService.register.users.create', () =>
				this.prisma.users.create({
					data: {
						email,
						password: hashedPassword,
						role: users_role.user,
						phone: payload.phone || null,
						full_name: payload.full_name || '',
						company: payload.company || '',
					},
				}),
			);
			this.logger.log(`[register] User creation completed for ${email}`);

			return {
				statusCode: 200,
				body: {
					success: true,
					message: 'Account created successfully. Please log in.',
				},
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === 'P2002'
			) {
				this.logger.warn(`[register] Duplicate email attempted: ${email}`);
				return {
					statusCode: 409,
					body: { error: 'Email already registered' },
				};
			}

			this.logger.error(
				`[register] Failed for ${email}: ${this.getErrorMessage(error)}`,
			);

			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async login(payload: LoginRequest): Promise<AuthServiceResult> {
		const loginValidationError = this.validateLogin(payload);
		if (loginValidationError) {
			return {
				statusCode: 400,
				body: { error: loginValidationError },
			};
		}

		const email = String(payload.email);
		const password = String(payload.password);

		try {
			this.logger.log(`[login] Looking up account for ${email}`);
			const user = await this.prisma.executeQuery('AuthService.login.users.findUnique', () =>
				this.prisma.users.findUnique({
					where: { email },
					select: {
						id: true,
						email: true,
						password: true,
						role: true,
						full_name: true,
						company: true,
					},
				}),
			);

			if (!user) {
				this.logger.warn(`[login] User not found for ${email}`);
				return {
					statusCode: 401,
					body: { error: 'Invalid credentials' },
				};
			}

			const passwordMatches = await bcrypt.compare(password, user.password);
			if (!passwordMatches) {
				this.logger.warn(`[login] Invalid password for ${email}`);
				return {
					statusCode: 401,
					body: { error: 'Invalid credentials' },
				};
			}

			const tokenPayload: JwtTokenPayload = {
				id: user.id,
				email: user.email,
				role: user.role,
			};

			const token = await this.jwtService.signAsync(tokenPayload);
			this.logger.log(`[login] Successful login for userId=${user.id}`);

			return {
				statusCode: 200,
				body: {
					token,
					user: {
						id: user.id,
						email: user.email,
						role: user.role,
						full_name: user.full_name,
						company: user.company,
					},
				},
			};
		} catch (error: unknown) {
			this.logger.error(
				`[login] Failed for ${email}: ${this.getErrorMessage(error)}`,
			);
			return {
				statusCode: 500,
				body: { error: this.getErrorMessage(error) },
			};
		}
	}

	async googleAuth(payload: GoogleAuthRequest): Promise<AuthServiceResult> {
		const googleValidationError = this.validateGoogleAuth(payload);
		if (googleValidationError) {
			return {
				statusCode: 400,
				body: { error: googleValidationError },
			};
		}

		const token = String(payload.token);

		try {
			const profile = await this.googleOAuthStrategy.verifyIdToken(token);
			this.logger.log(`[googleAuth] Google profile verified for ${profile.email}`);

			let user = await this.prisma.executeQuery('AuthService.googleAuth.users.findUnique', () =>
				this.prisma.users.findUnique({
					where: { email: profile.email },
					select: {
						id: true,
						email: true,
						role: true,
						full_name: true,
						company: true,
					},
				}),
			);

			if (!user) {
				const generatedPasswordHash = await bcrypt.hash(
					`oauth_${Date.now()}_${Math.random()}`,
					12,
				);

				try {
					user = await this.prisma.executeQuery('AuthService.googleAuth.users.create', () =>
						this.prisma.users.create({
							data: {
								email: profile.email,
								password: generatedPasswordHash,
								role: users_role.user,
								full_name: profile.name,
								phone: 'N/A',
							},
							select: {
								id: true,
								email: true,
								role: true,
								full_name: true,
								company: true,
							},
						}),
					);
				} catch (error: unknown) {
					if (
						error instanceof Prisma.PrismaClientKnownRequestError &&
						error.code === 'P2002'
					) {
						this.logger.warn(
							`[googleAuth] Duplicate email race while creating ${profile.email}; retrying lookup.`,
						);

						user = await this.prisma.executeQuery(
							'AuthService.googleAuth.users.findUnique.retry',
							() =>
								this.prisma.users.findUnique({
									where: { email: profile.email },
									select: {
										id: true,
										email: true,
										role: true,
										full_name: true,
										company: true,
									},
								}),
						);
					} else {
						throw error;
					}
				}
			}

			if (!user) {
				throw new Error('Google user could not be created or loaded.');
			}

			const tokenPayload: JwtTokenPayload = {
				id: user.id,
				email: user.email,
				role: user.role,
			};

			const jwtToken = await this.jwtService.signAsync(tokenPayload);
			this.logger.log(`[googleAuth] Successful Google login for userId=${user.id}`);

			return {
				statusCode: 200,
				body: {
					token: jwtToken,
					user: {
						id: user.id,
						email: user.email,
						role: user.role,
						full_name: user.full_name,
						company: user.company,
					},
				},
			};
		} catch (error: unknown) {
			if (
				error instanceof Error &&
				error.message === 'GOOGLE_CLIENT_ID is not configured.'
			) {
				this.logger.error('[googleAuth] GOOGLE_CLIENT_ID is missing in environment.');
				return {
					statusCode: 500,
					body: { error: 'GOOGLE_CLIENT_ID is not configured.' },
				};
			}

			this.logger.error(
				`[googleAuth] Failed: ${this.getErrorMessage(error)}`,
			);

			return {
				statusCode: 401,
				body: { error: `Google authentication failed: ${this.getErrorMessage(error)}` },
			};
		}
	}

	private validateRegister(payload: RegisterRequest): string | null {
		const { email, phone, password, full_name, company } = payload;

		if (!email || !password) {
			return 'email and password are required.';
		}

		if (!this.isEmail(email)) {
			return 'Invalid email format.';
		}

		if (String(password).length < 8) {
			return 'Password must be at least 8 characters.';
		}

		if (phone && (String(phone).length < 7 || String(phone).length > 20)) {
			return 'Invalid phone number length.';
		}

		if (full_name && String(full_name).length > 120) {
			return 'full_name too long.';
		}

		if (company && String(company).length > 120) {
			return 'company too long.';
		}

		return null;
	}

	private validateLogin(payload: LoginRequest): string | null {
		const { email, password } = payload;

		if (!email || !password) {
			return 'email and password are required.';
		}

		if (!this.isEmail(email)) {
			return 'Invalid email format.';
		}

		return null;
	}

	private validateGoogleAuth(payload: GoogleAuthRequest): string | null {
		const { token } = payload;

		if (!token || String(token).length < 20) {
			return 'Valid Google token is required.';
		}

		return null;
	}

	private isEmail(value: string): boolean {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
	}

	private getErrorMessage(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}

		return 'Unknown server error';
	}
}