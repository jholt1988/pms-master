import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { InitialAdminService } from './initial-admin.service';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  controllers: [UsersController],
  providers: [UsersService, InitialAdminService, OrgContextGuard],
  exports: [UsersService],
})
export class UsersModule {}
