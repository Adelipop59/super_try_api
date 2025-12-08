import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { StripeModule } from '../stripe/stripe.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [StripeModule, LogsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
