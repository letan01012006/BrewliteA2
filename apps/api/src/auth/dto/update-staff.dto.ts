import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateStaffDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ nullable: true, pattern: '^0[0-9]{9}$' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() || null : value)
  @IsOptional()
  @Matches(/^0[0-9]{9}$/, { message: 'Số điện thoại gồm 10 chữ số bắt đầu bằng 0' })
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 150 })
  @Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() || null : value)
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string | null;
}
