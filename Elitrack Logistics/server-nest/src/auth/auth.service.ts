import { Injectable } from '@nestjs/common';

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

@Injectable()
export class AuthService {
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

	login(payload: LoginRequest) {
		return {
			success: true,
			message: 'Mock login route is working',
			token: 'mock-jwt-token',
			user: {
				id: 1,
				email: payload.email ?? 'mock.user@example.com',
				role: 'user',
			},
		};
	}
}