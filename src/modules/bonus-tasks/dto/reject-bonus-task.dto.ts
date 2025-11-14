import { IsNotEmpty, IsString } from 'class-validator';

export class RejectBonusTaskDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason!: string;
}
