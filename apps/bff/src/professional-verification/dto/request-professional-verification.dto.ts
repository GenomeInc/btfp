import { IsEmail } from 'class-validator';

export class RequestProfessionalVerificationDto {
  @IsEmail()
  email!: string;
}
