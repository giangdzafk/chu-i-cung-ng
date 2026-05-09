import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Cấu hình CORS mở toang cửa cho Frontend (BẮT BUỘC ĐẶT Ở ĐÂY)
  app.enableCors({
    origin: true, // Cho phép mọi nguồn gọi tới
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

 
  await app.listen(3005);
}
bootstrap();