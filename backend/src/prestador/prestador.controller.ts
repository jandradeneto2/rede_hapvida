import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  UnauthorizedException,
  Delete,
  ParseFloatPipe,
  Optional,
} from '@nestjs/common';
import { PrestadorService } from './prestador.service';
import { FilterPrestadoresDto } from './dto/filter-prestadores.dto';
import { CreatePrestadorBatchDto } from './dto/create-prestador-batch.dto';

@Controller('prestadores')
export class PrestadorController {
  constructor(private readonly prestadorService: PrestadorService) {}

  private validateApiKey(key: string) {
    const expected = process.env.API_KEY || 'hapvida-secret-key';
    if (key !== expected) throw new UnauthorizedException('Invalid API key');
  }

  @Get()
  findAll(@Query() filters: FilterPrestadoresDto) {
    return this.prestadorService.findAll(filters);
  }

  @Get('aggregations')
  getAggregations(@Query() filters: FilterPrestadoresDto) {
    return this.prestadorService.getAggregations(filters);
  }

  @Get('suggest')
  suggest(@Query('q') q: string) {
    return this.prestadorService.suggest(q);
  }

  @Get('filter-options')
  getFilterOptions(@Query('uf') uf?: string) {
    return this.prestadorService.getFilterOptions(uf);
  }

  @Get('geo')
  getGeo(
    @Query() filters: FilterPrestadoresDto,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('raios') raios?: string,
  ) {
    const parsedLat = lat ? parseFloat(lat) : undefined;
    const parsedLng = lng ? parseFloat(lng) : undefined;
    const parsedRaios = raios
      ? raios.split(',').map((r) => parseFloat(r)).filter((r) => !isNaN(r))
      : undefined;
    return this.prestadorService.getGeo(filters, parsedLat, parsedLng, parsedRaios);
  }

  @Post('batch')
  batchIndex(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreatePrestadorBatchDto,
  ) {
    this.validateApiKey(apiKey);
    return this.prestadorService.batchIndex(dto.prestadores);
  }

  @Delete('clear')
  clearIndex(@Headers('x-api-key') apiKey: string) {
    this.validateApiKey(apiKey);
    return this.prestadorService.clearIndex();
  }
}
