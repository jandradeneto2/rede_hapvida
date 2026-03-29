import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { PrestadorController } from './prestador.controller';
import { PrestadorService } from './prestador.service';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      useFactory: () => ({
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      }),
    }),
  ],
  controllers: [PrestadorController],
  providers: [PrestadorService],
})
export class PrestadorModule {}
