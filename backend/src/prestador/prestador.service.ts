import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { FilterPrestadoresDto } from './dto/filter-prestadores.dto';
import { PrestadorItemDto } from './dto/create-prestador-batch.dto';

const INDEX = process.env.ELASTICSEARCH_INDEX || 'prestadores';

// Helper: text field with a keyword sub-field for aggregations/sorting.
// This matches ES dynamic mapping, ensuring compatibility whether the index
// was explicitly created or auto-created by a bulk request.
const kw = (above = 256) => ({
  type: 'text' as const,
  fields: { keyword: { type: 'keyword' as const, ignore_above: above } },
});

const INDEX_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        brazilian_lower: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding'],
        },
      },
    },
  },
  mappings: {
    properties: {
      operacao:        kw(),
      operadora:       kw(),
      nomeFantasia: {
        type: 'text',
        analyzer: 'brazilian_lower',
        fields: { keyword: { type: 'keyword', ignore_above: 256 } },
      },
      uf:              kw(),
      cidade:          kw(),
      endereco:        { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 512 } } },
      complemento:     kw(),
      bairro:          kw(),
      cep:             kw(),
      telefones:       kw(),
      contratacao:     kw(),
      servico:         kw(),
      grupoServico:    kw(),
      especialidade:   kw(),
      rede:            kw(),
      localizacao:     { type: 'geo_point' },
      codigoPrestador: { type: 'long' },
      cnpjCpf:         kw(),
      razaoSocial: {
        type: 'text',
        analyzer: 'brazilian_lower',
        fields: { keyword: { type: 'keyword', ignore_above: 256 } },
      },
      crmCnes:         kw(),
      redeProduto:     kw(),
      suggest:         { type: 'completion' },
    },
  },
};

@Injectable()
export class PrestadorService implements OnModuleInit {
  private readonly logger = new Logger(PrestadorService.name);

  constructor(private readonly esService: ElasticsearchService) {}

  async onModuleInit() {
    await this.ensureIndex();
  }

  private async ensureIndex() {
    try {
      const exists = await this.esService.indices.exists({ index: INDEX });
      if (!exists) {
        await this.esService.indices.create({ index: INDEX, ...(INDEX_MAPPING as any) });
        this.logger.log(`Index "${INDEX}" created.`);
      } else {
        this.logger.log(`Index "${INDEX}" already exists.`);
      }
    } catch (err) {
      this.logger.error('Failed to ensure ES index', err);
    }
  }

  private buildBoolQuery(filters: Partial<FilterPrestadoresDto>) {
    const must: any[] = [];

    if (filters.redeProduto) {
      must.push({ term: { 'redeProduto.keyword': filters.redeProduto } });
    }

    const termFields: [string, string | undefined][] = [
      ['operacao.keyword', filters.operacao],
      ['operadora.keyword', filters.operadora],
      ['uf.keyword', filters.uf],
      ['cidade.keyword', filters.cidade],
      ['servico.keyword', filters.servico],
      ['grupoServico.keyword', filters.grupoServico],
      ['especialidade.keyword', filters.especialidade],
      ['rede.keyword', filters.rede],
      ['cnpjCpf.keyword', filters.cnpjCpf],
    ];

    for (const [field, value] of termFields) {
      if (value) must.push({ term: { [field]: value } });
    }

    if (filters.search) {
      must.push({
        multi_match: {
          query: filters.search,
          fields: ['nomeFantasia', 'razaoSocial', 'cnpjCpf', 'endereco'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    return must.length > 0 ? { bool: { must } } : { match_all: {} };
  }

  async findAll(filters: FilterPrestadoresDto) {
    const { limit = 50, searchAfter } = filters;

    const sortValues = searchAfter ? JSON.parse(searchAfter) : undefined;

    const response = await this.esService.search({
      index: INDEX,
      size: limit,
      track_total_hits: true,
      query: this.buildBoolQuery(filters),
      sort: [
        { 'operadora.keyword': 'asc' },
        { 'rede.keyword': 'desc' },
        { 'uf.keyword': 'asc' },
        { 'cidade.keyword': 'asc' },
        { 'nomeFantasia.keyword': 'asc' },
        { _shard_doc: 'asc' },
      ],
      ...(sortValues ? { search_after: sortValues } : {}),
      _source: true,
    });

    const total = typeof response.hits.total === 'number'
      ? response.hits.total
      : (response.hits.total as any)?.value ?? 0;

    const hits = response.hits.hits;
    const lastHit = hits[hits.length - 1];
    const nextSearchAfter = lastHit?.sort ? JSON.stringify(lastHit.sort) : null;

    return {
      data: hits.map((h) => ({ id: h._id, ...(h._source as object) })),
      total,
      limit,
      nextSearchAfter,
    };
  }

  async getAggregations(filters: FilterPrestadoresDto) {
    const response = await this.esService.search({
      index: INDEX,
      size: 0,
      query: this.buildBoolQuery(filters),
      aggs: {
        total_prestadores: { cardinality: { field: 'cnpjCpf.keyword' } },
        total_locais: {
          cardinality: {
            field: 'endereco.keyword',
            precision_threshold: 40000,
          },
        },
        total_ufs: { cardinality: { field: 'uf.keyword' } },
        total_cidades: { cardinality: { field: 'cidade.keyword' } },
        propria_count: {
          filter: { term: { 'rede.keyword': 'Própria' } },
          aggs: { distinct: { cardinality: { field: 'cnpjCpf.keyword' } } },
        },
        credenciada_count: {
          filter: { term: { 'rede.keyword': 'Credenciada' } },
          aggs: { distinct: { cardinality: { field: 'cnpjCpf.keyword' } } },
        },
        por_operadora: {
          terms: { field: 'operadora.keyword', size: 50 },
          aggs: { distinct_cnpj: { cardinality: { field: 'cnpjCpf.keyword' } } },
        },
        por_uf: {
          terms: { field: 'uf.keyword', size: 30 },
          aggs: { distinct_cnpj: { cardinality: { field: 'cnpjCpf.keyword' } } },
        },
        por_cidade: {
          terms: { field: 'cidade.keyword', size: 500 },
          aggs: { distinct_cnpj: { cardinality: { field: 'cnpjCpf.keyword' } } },
        },
        por_servico: {
          terms: { field: 'servico.keyword', size: 50 },
          aggs: { distinct_cnpj: { cardinality: { field: 'cnpjCpf.keyword' } } },
        },
        por_grupo: {
          terms: { field: 'grupoServico.keyword', size: 100 },
          aggs: { distinct_cnpj: { cardinality: { field: 'cnpjCpf.keyword' } } },
        },
        por_especialidade: {
          terms: { field: 'especialidade.keyword', size: 200 },
          aggs: { distinct_cnpj: { cardinality: { field: 'cnpjCpf.keyword' } } },
        },
        por_rede: {
          terms: { field: 'rede.keyword', size: 10 },
          aggs: { distinct_cnpj: { cardinality: { field: 'cnpjCpf.keyword' } } },
        },
      },
    });

    const aggs = response.aggregations as any;
    const mapTerms = (bucket: any) =>
      bucket.buckets.map((b: any) => ({
        name: b.key,
        count: b.distinct_cnpj?.value ?? b.doc_count,
      }));

    return {
      kpis: {
        totalPrestadores: aggs.total_prestadores.value,
        totalLocais: aggs.total_locais.value,
        totalUfs: aggs.total_ufs.value,
        totalCidades: aggs.total_cidades.value,
        ownNetwork: aggs.propria_count.distinct.value,
        accreditedNetwork: aggs.credenciada_count.distinct.value,
      },
      porOperadora: mapTerms(aggs.por_operadora),
      porUf: mapTerms(aggs.por_uf),
      porCidade: mapTerms(aggs.por_cidade),
      porServico: mapTerms(aggs.por_servico),
      porGrupo: mapTerms(aggs.por_grupo),
      porEspecialidade: mapTerms(aggs.por_especialidade),
      porRede: mapTerms(aggs.por_rede),
    };
  }

  async suggest(q: string) {
    if (!q || q.length < 2) return [];

    const response = await this.esService.search({
      index: INDEX,
      size: 10,
      query: {
        bool: {
          should: [
            {
              multi_match: {
                query: q,
                fields: ['nomeFantasia^2', 'razaoSocial'],
                type: 'phrase_prefix',
              },
            },
            { prefix: { cnpjCpf: { value: q } } },
          ],
        },
      },
      _source: ['nomeFantasia', 'cnpjCpf', 'razaoSocial', 'codigoPrestador'],
      collapse: { field: 'cnpjCpf.keyword' },
    });

    return response.hits.hits.map((h) => ({ id: h._id, ...(h._source as object) }));
  }

  async getFilterOptions(uf?: string, operacao?: string) {
    const must: any[] = [];
    if (uf) must.push({ term: { 'uf.keyword': uf } });
    if (operacao) must.push({ term: { 'operacao.keyword': operacao } });
    const filter = must.length > 0 ? { bool: { must } } : { match_all: {} };

    const response = await this.esService.search({
      index: INDEX,
      size: 0,
      query: filter,
      aggs: {
        operadoras: { terms: { field: 'operadora.keyword', size: 50, order: { _key: 'asc' } } },
        ufs: { terms: { field: 'uf.keyword', size: 30, order: { _key: 'asc' } } },
        cidades: { terms: { field: 'cidade.keyword', size: 10000, order: { _key: 'asc' } } },
        servicos: { terms: { field: 'servico.keyword', size: 50, order: { _key: 'asc' } } },
        grupos: { terms: { field: 'grupoServico.keyword', size: 200, order: { _key: 'asc' } } },
        especialidades: { terms: { field: 'especialidade.keyword', size: 500, order: { _key: 'asc' } } },
        redes: { terms: { field: 'rede.keyword', size: 10, order: { _key: 'asc' } } },
        redeProdutos: { terms: { field: 'redeProduto.keyword', size: 500, order: { _key: 'asc' } } },
      },
    });

    const aggs = response.aggregations as any;
    const keys = (b: any) => b.buckets.map((x: any) => x.key).filter(Boolean);

    return {
      operadoras: keys(aggs.operadoras),
      ufs: keys(aggs.ufs),
      cidades: keys(aggs.cidades),
      servicos: keys(aggs.servicos),
      grupos: keys(aggs.grupos),
      especialidades: keys(aggs.especialidades),
      redes: keys(aggs.redes),
      redeProdutos: keys(aggs.redeProdutos).filter((v: string) => v !== '0'),
    };
  }

  async getGeo(filters: FilterPrestadoresDto, lat?: number, lng?: number, raios?: number[]) {
    const boolQuery = this.buildBoolQuery(filters);

    // Always filter only records with coordinates
    const withCoords: any = {
      bool: {
        must: [
          boolQuery,
          { exists: { field: 'localizacao' } },
        ],
      },
    };

    const aggs: any = {};

    if (lat != null && lng != null && raios?.length) {
      const sortedRaios = [...raios].sort((a, b) => a - b);

      const geoRanges: any[] = sortedRaios.flatMap((r, i) =>
        i === 0
          ? [{ key: `ate_${r}km`, to: r }]
          : [{ key: `${sortedRaios[i - 1]}_${r}km`, from: sortedRaios[i - 1], to: r }],
      );
      geoRanges.push({
        key: `acima_${sortedRaios[sortedRaios.length - 1]}km`,
        from: sortedRaios[sortedRaios.length - 1],
      });

      aggs.por_raio = {
        geo_distance: {
          field: 'localizacao',
          origin: { lat, lon: lng },
          unit: 'km',
          ranges: geoRanges,
        },
        aggs: {
          distinct_cnpj: { cardinality: { field: 'cnpjCpf.keyword' } },
        },
      };
    }

    const [markersRes, aggsRes] = await Promise.all([
      this.esService.search({
        index: INDEX,
        size: 10000,
        query: withCoords,
        _source: [
          'nomeFantasia', 'razaoSocial', 'cnpjCpf', 'servico', 'rede',
          'cidade', 'uf', 'localizacao', 'operadora',
        ],
      }),
      lat != null && lng != null
        ? this.esService.search({
            index: INDEX,
            size: 0,
            query: withCoords,
            aggs,
          })
        : Promise.resolve(null),
    ]);

    const markers = markersRes.hits.hits.map((h) => ({ id: h._id, ...(h._source as object) }));

    let raioContagens: any[] = [];
    if (aggsRes) {
      const raioAgg = (aggsRes.aggregations as any)?.por_raio;
      if (raioAgg) {
        raioContagens = raioAgg.buckets.map((b: any) => ({
          faixa: b.key,
          prestadores: b.distinct_cnpj?.value ?? b.doc_count,
        }));
      }
    }

    return { markers, raioContagens };
  }

  async batchIndex(prestadores: PrestadorItemDto[]) {
    if (!prestadores.length) return { indexed: 0, errors: [] };

    const operations = prestadores.flatMap((p) => {
      const doc = {
        operacao: p.operacao || '',
        operadora: p.operadora,
        nomeFantasia: p.nomeFantasia,
        uf: p.uf,
        cidade: p.cidade,
        endereco: p.endereco,
        complemento: p.complemento || '',
        bairro: p.bairro || '',
        cep: p.cep || '',
        telefones: p.telefones || '',
        contratacao: p.contratacao,
        servico: p.servico,
        grupoServico: p.grupoServico || '',
        especialidade: p.especialidade || '',
        rede: p.rede,
        localizacao:
          p.lat != null && p.lon != null && p.lat !== 0 && p.lon !== 0
            ? { lat: p.lat, lon: p.lon }
            : null,
        codigoPrestador: p.codigoPrestador,
        cnpjCpf: p.cnpjCpf,
        razaoSocial: p.razaoSocial,
        crmCnes: p.crmCnes || '',
        redeProduto: p.redeProduto || '0',
        suggest: {
          input: [p.nomeFantasia, p.razaoSocial, p.cnpjCpf].filter(Boolean),
        },
      };

      // Composite ID covering all GROUP BY dimensions to guarantee uniqueness
      const id = `${p.codigoPrestador}_${p.servico}_${p.grupoServico || ''}_${p.especialidade || ''}_${p.operacao || ''}_${p.redeProduto || '0'}`
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .slice(0, 512);

      return [{ index: { _index: INDEX, _id: id } }, doc];
    });

    const response = await this.esService.bulk({ operations, refresh: false });

    const errors = response.items
      .filter((item) => item.index?.error)
      .map((item) => item.index?.error);

    return {
      indexed: prestadores.length - errors.length,
      errors: errors.slice(0, 10),
    };
  }

  async clearIndex() {
    await this.esService.deleteByQuery({
      index: INDEX,
      query: { match_all: {} },
      refresh: true,
    });
    return { cleared: true };
  }
}
