import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { PrestadorModule } from './prestador/prestador.module';
import { OracleModule } from './oracle/oracle.module';
import { RedeProdutoModule } from './rede-produto/rede-produto.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ElasticsearchModule.registerAsync({
      useFactory: () => ({
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      }),
    }),
    OracleModule,
    PrestadorModule,
    RedeProdutoModule,
  ],
})
export class AppModule {}
