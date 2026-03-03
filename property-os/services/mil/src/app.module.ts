import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { HealthController } from "./health.controller";
import { EdgeOverlaysController } from "./edge-overlays.controller";
import { SecondaryDamageController } from "./secondary-damage.controller";
import { BoundaryController } from "./boundary.controller";
import { TokensController } from "./tokens.controller";

@Module({
  controllers: [HealthController, EdgeOverlaysController, SecondaryDamageController, BoundaryController, TokensController],
  providers: [PrismaService],
})
export class AppModule {}
