import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { InitialAdminService } from './initial-admin.service';
import { DefaultApi as MilApiClient } from '@propertyos/mil-client';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [UsersController],
  providers: [
    UsersService, 
    InitialAdminService,
    {
      provide: MilApiClient,
      useFactory: (configService: ConfigService) => {
        const milServiceUrl = configService.get<string>('MIL_SERVICE_URL', 'http://mil:3010');
        return new MilApiClient(undefined, milServiceUrl);
      },
      inject: [ConfigService],
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
