import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService, JwtTokenPayload, LoginRequest, RegisterRequest } from './auth.service';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('register')
	register(@Body() payload: RegisterRequest) {
		return this.authService.register(payload);
	}

	@Post('login')
	async login(@Body() payload: LoginRequest) {
		return this.authService.login(payload);
	}

	@UseGuards(AuthGuard)
	@Get('test-protected')
	testProtected(@Req() request: { user?: JwtTokenPayload }) {
		return {
			success: true,
			message: 'Protected test route is working',
			user: request.user ?? null,
		};
	}
}