import { IsNotEmpty, IsString } from 'class-validator';

export class SetPublicKeyDto {
  @IsString()
  @IsNotEmpty()
  publicKey: string;
}
