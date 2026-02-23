import { Module } from '@nestjs/common';
import { UGCService } from './ugc.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UGCService],
  exports: [UGCService],
})
export class UGCModule {}
