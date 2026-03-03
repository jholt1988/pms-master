import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors:true });
  const config = new DocumentBuilder().setTitle("workflow-engine").setVersion("0.1.0").build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, doc);
  const port = Number(process.env.PORT || 3003);
  await app.listen(port);
  console.log(`[$workflow-engine] listening on :${port}`);
}
bootstrap();
