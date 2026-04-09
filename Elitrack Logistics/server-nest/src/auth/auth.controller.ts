import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, LoginRequest, RegisterRequest } from './auth.service';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('register')
	register(@Body() payload: RegisterRequest) {
		return this.authService.register(payload);
	}

	@Post('login')
	login(@Body() payload: LoginRequest) {
		return this.authService.login(payload);
	}
}