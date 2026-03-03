import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { HealthController } from "./health.controller";
import { IntentsController } from "./intents.controller";

@Module({
  controllers: [HealthController, IntentsController],
  providers: [PrismaService],
})
export class AppModule {}
