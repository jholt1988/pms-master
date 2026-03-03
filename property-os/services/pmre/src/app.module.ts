import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { HealthController } from "./health.controller";
import { SimulationController } from "./simulation.controller";

@Module({
  controllers: [HealthController, SimulationController],
  providers: [PrismaService],
})
export class AppModule {}
