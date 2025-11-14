import { IsArray, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class SubmitBonusTaskDto {
  @IsArray()
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  @IsNotEmpty()
  submissionUrls!: string[]; // URLs des fichiers uploadés (photos, vidéos, etc.)
}
