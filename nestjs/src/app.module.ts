import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from './modules/identity/module'; 
import { FarmModule } from './modules/farm/presentation/controllers/FarmModule'; 
import { ProcessingModule } from './modules/processing/presentation/controllers/ProcessingModule';
import { LogisticsModule } from './modules/logictics/presentation/controllers/LogicticsModule';
import { TrackingModule } from './modules/tracking/presentation/controllers/TrackingModule';
import { AdminModule } from './modules/admin/presentation/controllers/AdminModule';
@Module({
  imports: [
    // 1. Load cấu hình môi trường
    ConfigModule.forRoot({
      isGlobal: true, 
      envFilePath: '.env',
    }),

    // 2. Cấu hình Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true, 
        synchronize: true,
        logging: ['query', 'error'], 
      }),
    }),

    IdentityModule, 
    FarmModule,
    ProcessingModule,
    LogisticsModule,
    TrackingModule, 
    AdminModule,
  ],
})
export class AppModule {}