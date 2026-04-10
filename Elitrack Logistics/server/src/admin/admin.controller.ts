import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { JwtTokenPayload } from '../auth/auth.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminDbRoleGuard } from './admin-db-role.guard';
import { AdminService, CreateAdminRequest } from './admin.service';

interface AuthenticatedRequest {
	user?: JwtTokenPayload;
}

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	@Get('dev/seeded-users-checklist')
	@UseGuards(RolesGuard)
	@Roles('super_admin')
	async getSeededUsersChecklist(@Res() res: Response): Promise<void> {
		const result = await this.adminService.getSeededUsersChecklist();
		res.status(result.statusCode).json(result.body);
	}

	@Get('stats')
	@UseGuards(RolesGuard)
	@Roles('admin', 'super_admin')
	async getStats(@Res() res: Response): Promise<void> {
		const result = await this.adminService.getStats();
		res.status(result.statusCode).json(result.body);
	}

	@Get('users')
	@UseGuards(RolesGuard)
	@Roles('admin', 'super_admin')
	async getUsers(@Res() res: Response): Promise<void> {
		const result = await this.adminService.getUsers();
		res.status(result.statusCode).json(result.body);
	}

	@Post('create-admin')
	@UseGuards(RolesGuard)
	@Roles('super_admin')
	async createAdmin(
		@Body() body: CreateAdminRequest,
		@Res() res: Response,
	): Promise<void> {
		const result = await this.adminService.createAdmin(body);
		res.status(result.statusCode).json(result.body);
	}

	@Delete('users/:id')
	@UseGuards(RolesGuard)
	@Roles('admin', 'super_admin')
	async removeUser(
		@Req() req: AuthenticatedRequest,
		@Param('id') id: string,
		@Res() res: Response,
	): Promise<void> {
		const result = await this.adminService.removeUser(req.user, id);
		res.status(result.statusCode).json(result.body);
	}

	@Get('transactions')
	@UseGuards(AdminDbRoleGuard)
	async getTransactions(@Res() res: Response): Promise<void> {
		const result = await this.adminService.getTransactions();
		res.status(result.statusCode).json(result.body);
	}

	@Get('notifications')
	@UseGuards(AdminDbRoleGuard)
	async getNotifications(@Res() res: Response): Promise<void> {
		const result = await this.adminService.getNotifications();
		res.status(result.statusCode).json(result.body);
	}

	@Get('audit-logs')
	@UseGuards(AdminDbRoleGuard)
	async getAuditLogs(@Res() res: Response): Promise<void> {
		const result = await this.adminService.getAuditLogs();
		res.status(result.statusCode).json(result.body);
	}
}