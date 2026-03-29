import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { RedeProdutoService } from './rede-produto.service';
import { SearchRedeProdutoDto } from './dto/search-rede-produto.dto';

@Controller('rede-produto')
export class RedeProdutoController {
  constructor(private readonly redeProdutoService: RedeProdutoService) {}

  @Get('search')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  search(@Query() dto: SearchRedeProdutoDto) {
    return this.redeProdutoService.search(dto);
  }
}
