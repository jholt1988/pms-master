import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { InitialAdminService } from './initial-admin.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, InitialAdminService],
  exports: [UsersService],
})
export class UsersModule {}
