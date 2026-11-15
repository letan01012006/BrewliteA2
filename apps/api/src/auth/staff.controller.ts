import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { QueryStaffDto } from './dto/query-staff.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('admin/staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
@Controller('admin/staff')
export class StaffController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'MANAGER xem danh sách nhân viên, mới nhất trước' })
  @ApiResponse({ status: 200, description: 'Danh sách BARISTA phân trang { data, meta }; không trả mật khẩu hoặc dữ liệu OTP' })
  @ApiResponse({ status: 400, description: 'Tham số phân trang không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Thiếu JWT hoặc JWT không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Chỉ MANAGER được xem danh sách nhân viên' })
  list(@Query() query: QueryStaffDto) { return this.auth.listStaff(query); }

  @Post()
  @ApiBody({ type: RegisterDto, examples: {
    barista: { summary: 'Cấp BARISTA không cần OTP', value: { fullName: 'Nhân viên BrewLite', phone: '0912345679', password: 'Barista@123' } },
  } })
  @ApiOperation({ summary: 'MANAGER cấp tài khoản BARISTA không cần OTP, đăng nhập ngay' })
  @ApiResponse({ status: 201, description: 'User BARISTA, isPhoneVerified=true do quản lý cấp, không xác minh SĐT qua SMS; không trả passwordHash' })
  @ApiResponse({ status: 401, description: 'Thiếu JWT hoặc JWT không hợp lệ' })
  @ApiResponse({ status: 403, description: 'CUSTOMER và BARISTA không có quyền cấp tài khoản' })
  @ApiResponse({ status: 409, description: 'Trùng phone hoặc email' })
  create(@Body() dto: RegisterDto) { return this.auth.createStaff(dto); }
}
