import { Module } from '@nestjs/common';
import { RedeProdutoController } from './rede-produto.controller';
import { RedeProdutoService } from './rede-produto.service';

@Module({
  controllers: [RedeProdutoController],
  providers: [RedeProdutoService],
})
export class RedeProdutoModule {}
