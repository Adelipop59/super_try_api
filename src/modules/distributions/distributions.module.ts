import { Module } from '@nestjs/common';
import { DistributionsService } from './distributions.service';
import { DistributionsController } from './distributions.controller';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DistributionsController],
  providers: [DistributionsService],
  exports: [DistributionsService],
})
export class DistributionsModule {}
