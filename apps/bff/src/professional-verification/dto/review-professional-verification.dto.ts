import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ReviewProfessionalVerificationDto {
  @IsBoolean()
  approve!: boolean;

  @IsString()
  @IsOptional()
  reason?: string;
}
