import { Module } from '@nestjs/common';
import { CriteriaTemplatesController } from './criteria-templates.controller';
import { CriteriaTemplatesService } from './criteria-templates.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CriteriaTemplatesController],
  providers: [CriteriaTemplatesService],
  exports: [CriteriaTemplatesService],
})
export class CriteriaTemplatesModule {}
