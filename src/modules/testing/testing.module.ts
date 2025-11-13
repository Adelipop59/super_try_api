import { Module } from '@nestjs/common';
import { TestingController } from './testing.controller';
import { ApiTesterService } from './api-tester.service';
import { ApiTesterV2Service } from './api-tester-v2.service';
import { PrismaModule } from '../../database/prisma.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [PrismaModule, LogsModule],
  controllers: [TestingController],
  providers: [ApiTesterService, ApiTesterV2Service],
})
export class TestingModule {}
