import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { StripeModule } from '../stripe/stripe.module';
import { LogsModule } from '../logs/logs.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [StripeModule, LogsModule, forwardRef(() => WalletsModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
