import { IsString, Length } from 'class-validator';

export class ConfirmProfessionalVerificationDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
