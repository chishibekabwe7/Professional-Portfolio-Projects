import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from './auth.guard';
import {
    AuthService,
    GoogleAuthRequest,
    JwtTokenPayload,
    LoginRequest,
    RegisterRequest,
} from './auth.service';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('register')
	async register(@Body() payload: RegisterRequest, @Res() response: Response) {
		const result = await this.authService.register(payload);
		return response.status(result.statusCode).json(result.body);
	}

	@Post('login')
	async login(@Body() payload: LoginRequest, @Res() response: Response) {
		const result = await this.authService.login(payload);
		return response.status(result.statusCode).json(result.body);
	}

	@Post('google')
	async google(@Body() payload: GoogleAuthRequest, @Res() response: Response) {
		const result = await this.authService.googleAuth(payload);
		return response.status(result.statusCode).json(result.body);
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