import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshRequestDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
