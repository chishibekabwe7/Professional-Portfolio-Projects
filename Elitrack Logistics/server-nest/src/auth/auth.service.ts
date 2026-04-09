import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

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

export interface JwtTokenPayload {
	sub: number;
	email: string;
	role: 'super_admin' | 'admin' | 'user';
}

@Injectable()
export class AuthService {
	constructor(private readonly jwtService: JwtService) {}

	register(payload: RegisterRequest) {
		return {
			success: true,
			message: 'Mock register route is working',
			data: {
				email: payload.email ?? 'mock.user@example.com',
				full_name: payload.full_name ?? 'Mock User',
				company: payload.company ?? 'Mock Company',
			},
		};
	}

	async login(payload: LoginRequest) {
		const user = {
			id: 1,
			email: payload.email ?? 'mock.user@example.com',
			role: 'user' as const,
		};

		const tokenPayload: JwtTokenPayload = {
			sub: user.id,
			email: user.email,
			role: user.role,
		};

		const token = await this.jwtService.signAsync(tokenPayload);

		return {
			success: true,
			message: 'Mock login route is working',
			token,
			user,
		};
	}
}