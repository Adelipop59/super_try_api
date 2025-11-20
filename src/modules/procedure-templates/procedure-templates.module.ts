import { Module } from '@nestjs/common';
import { ProcedureTemplatesController } from './procedure-templates.controller';
import { ProcedureTemplatesService } from './procedure-templates.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProcedureTemplatesController],
  providers: [ProcedureTemplatesService],
  exports: [ProcedureTemplatesService],
})
export class ProcedureTemplatesModule {}
