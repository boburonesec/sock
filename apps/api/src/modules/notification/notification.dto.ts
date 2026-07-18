import { IsIn, IsOptional, IsString } from 'class-validator';

export class AcknowledgeDeliveryDto {
  @IsIn(['SENT', 'FAILED']) status!: 'SENT' | 'FAILED';
  @IsOptional() @IsString() error?: string;
}
