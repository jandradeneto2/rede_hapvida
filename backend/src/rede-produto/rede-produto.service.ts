import { Injectable, BadRequestException } from '@nestjs/common';
import { OracleService } from '../oracle/oracle.service';
import { SearchRedeProdutoDto, TipoBuscaRedeProduto } from './dto/search-rede-produto.dto';

export interface RedeProdutoSearchResult {
  cdTipoRedeAtendimento: number | null;
  nmComercialRede: string;
  nmPessoa?: string;
  nuCgcCpf?: string;
  operadora?: string;
  cdPlano?: number;
  nmPlano?: string;
  nuRegPlanoAns?: string;
  dsPlanoAns?: string;
  cdUsuario?: string;
}

// CASE expression for operadora — matches the indexador pattern
const OPERADORA_CASE = `
  CASE
    WHEN TP.CD_EMPRESA_PLANO = 14 THEN 'NDI SP'
    WHEN TP.CD_EMPRESA_PLANO = 12 THEN 'HB SAUDE'
    WHEN TP.CD_EMPRESA_PLANO = 10 THEN 'NDI MG'
    WHEN TP.CD_EMPRESA_PLANO = 9  THEN 'CLINIPAM'
    WHEN TP.CD_EMPRESA_PLANO = 8  THEN 'CCG'
    WHEN TP.CD_EMPRESA_PLANO = 7  THEN 'RN'
    WHEN TP.CD_EMPRESA_PLANO = 1  THEN 'HAPVIDA'
    WHEN TP.CD_EMPRESA_PLANO = 3  THEN 'ODONTO'
    ELSE 'Outros'
  END
`;

const BENEFICIARIO_SELECT = `
  SELECT TP.NM_PESSOA_RAZAO_SOCIAL     AS NM_PESSOA,
         TP.NU_CGC_CPF                 AS NU_CGC_CPF,
         ${OPERADORA_CASE}             AS OPERADORA,
         TU.CD_PLANO                   AS CD_PLANO,
         TU.CD_USUARIO                 AS CD_USUARIO,
         P.NM_PLANO                    AS NM_PLANO,
         PA.NU_REG_PLANO_ANS           AS NU_REG_PLANO_ANS,
         PP.CD_TIPO_REDE_ATENDIMENTO   AS CD_TIPO_REDE_ATENDIMENTO,
         TR.NM_COMERCIAL_REDE          AS NM_COMERCIAL_REDE
  FROM   TB_PESSOA             TP,
         TB_USUARIO             TU,
         TB_TIPO_REDE_ATENDIMENTO TR,
         TB_PLANO_PAI           PP,
         TB_REGISTRO_PLANO_ANS  RP,
         TB_PLANO_ANS           PA,
         TB_PLANO               P
  WHERE  TU.CD_PESSOA = TP.CD_PESSOA
    AND  TU.DT_CANCELAMENTO IS NULL
    AND  P.CD_PLANO_PAI = PP.CD_PLANO_PAI
    AND  TR.CD_TIPO_REDE_ATENDIMENTO = PP.CD_TIPO_REDE_ATENDIMENTO
    AND  P.CD_PLANO = PA.CD_PLANO(+)
    AND  PA.NU_REG_PLANO_ANS = RP.NU_REG_PLANO_ANS
    AND  P.CD_PLANO = TU.CD_PLANO
`;

@Injectable()
export class RedeProdutoService {
  constructor(private readonly oracle: OracleService) {}

  async search(dto: SearchRedeProdutoDto): Promise<RedeProdutoSearchResult[]> {
    switch (dto.tipo) {
      case TipoBuscaRedeProduto.BENEFICIARIO_NOME:
        return this.searchByBeneficiarioNome(dto.q);
      case TipoBuscaRedeProduto.BENEFICIARIO_CARTEIRINHA:
        return this.searchByBeneficiarioCarteirinha(dto.q);
      case TipoBuscaRedeProduto.PLANO:
        return this.searchByPlano(dto.q);
      case TipoBuscaRedeProduto.PRODUTO:
        return this.searchByProduto(dto.q);
      case TipoBuscaRedeProduto.REDE:
        return this.searchByRede(dto.q);
      default:
        throw new BadRequestException('Tipo de busca inválido');
    }
  }

  private async searchByBeneficiarioNome(q: string): Promise<RedeProdutoSearchResult[]> {
    const sql = `${BENEFICIARIO_SELECT} AND TP.NM_PESSOA_RAZAO_SOCIAL LIKE :q`;
    const rows = await this.oracle.query<any>(sql, { q: `${q.toUpperCase()}%` });
    return rows.map(this.mapBeneficiarioRow);
  }

  private async searchByBeneficiarioCarteirinha(q: string): Promise<RedeProdutoSearchResult[]> {
    const sql = `${BENEFICIARIO_SELECT} AND TU.CD_USUARIO = :q`;
    const rows = await this.oracle.query<any>(sql, { q });
    return rows.map(this.mapBeneficiarioRow);
  }

  private async searchByPlano(q: string): Promise<RedeProdutoSearchResult[]> {
    // Try exact numeric match on cd_plano first, then LIKE on nm_plano
    const cdPlano = parseInt(q, 10);
    let sql: string;
    let binds: Record<string, any>;

    if (!isNaN(cdPlano)) {
      sql = `
        SELECT P.CD_PLANO                   AS CD_PLANO,
               P.NM_PLANO                   AS NM_PLANO,
               PP.CD_TIPO_REDE_ATENDIMENTO  AS CD_TIPO_REDE_ATENDIMENTO,
               TR.NM_COMERCIAL_REDE         AS NM_COMERCIAL_REDE,
               RPA.NU_REG_PLANO_ANS         AS NU_REG_PLANO_ANS,
               RPA.DS_PLANO_ANS             AS DS_PLANO_ANS
        FROM   TB_TIPO_REDE_ATENDIMENTO TR,
               TB_PLANO_PAI             PP,
               TB_REGISTRO_PLANO_ANS    RPA,
               TB_PLANO_ANS             PA,
               TB_PLANO                 P
        WHERE  P.CD_PLANO_PAI = PP.CD_PLANO_PAI
          AND  TR.CD_TIPO_REDE_ATENDIMENTO = PP.CD_TIPO_REDE_ATENDIMENTO
          AND  P.CD_PLANO = PA.CD_PLANO(+)
          AND  PA.NU_REG_PLANO_ANS = RPA.NU_REG_PLANO_ANS
          AND  P.CD_PLANO = :cdPlano
      `;
      binds = { cdPlano };
    } else {
      sql = `
        SELECT P.CD_PLANO                   AS CD_PLANO,
               P.NM_PLANO                   AS NM_PLANO,
               PP.CD_TIPO_REDE_ATENDIMENTO  AS CD_TIPO_REDE_ATENDIMENTO,
               TR.NM_COMERCIAL_REDE         AS NM_COMERCIAL_REDE,
               RPA.NU_REG_PLANO_ANS         AS NU_REG_PLANO_ANS,
               RPA.DS_PLANO_ANS             AS DS_PLANO_ANS
        FROM   TB_TIPO_REDE_ATENDIMENTO TR,
               TB_PLANO_PAI             PP,
               TB_REGISTRO_PLANO_ANS    RPA,
               TB_PLANO_ANS             PA,
               TB_PLANO                 P
        WHERE  P.CD_PLANO_PAI = PP.CD_PLANO_PAI
          AND  TR.CD_TIPO_REDE_ATENDIMENTO = PP.CD_TIPO_REDE_ATENDIMENTO
          AND  P.CD_PLANO = PA.CD_PLANO(+)
          AND  PA.NU_REG_PLANO_ANS = RPA.NU_REG_PLANO_ANS
          AND  UPPER(P.NM_PLANO) LIKE :q
      `;
      binds = { q: `%${q.toUpperCase()}%` };
    }

    const rows = await this.oracle.query<any>(sql, binds);
    return rows.map((r) => ({
      cdTipoRedeAtendimento: r.CD_TIPO_REDE_ATENDIMENTO ?? null,
      nmComercialRede: r.NM_COMERCIAL_REDE ?? '',
      cdPlano: r.CD_PLANO,
      nmPlano: r.NM_PLANO,
      nuRegPlanoAns: r.NU_REG_PLANO_ANS,
      dsPlanoAns: r.DS_PLANO_ANS,
    }));
  }

  private async searchByProduto(q: string): Promise<RedeProdutoSearchResult[]> {
    // Search tb_registro_plano_ans and join to get rede info
    const sql = `
      SELECT RPA.NU_REG_PLANO_ANS          AS NU_REG_PLANO_ANS,
             RPA.DS_PLANO_ANS              AS DS_PLANO_ANS,
             PP.CD_TIPO_REDE_ATENDIMENTO   AS CD_TIPO_REDE_ATENDIMENTO,
             TR.NM_COMERCIAL_REDE          AS NM_COMERCIAL_REDE,
             P.CD_PLANO                    AS CD_PLANO,
             P.NM_PLANO                    AS NM_PLANO
      FROM   TB_REGISTRO_PLANO_ANS   RPA,
             TB_PLANO_ANS            PA,
             TB_PLANO                P,
             TB_PLANO_PAI            PP,
             TB_TIPO_REDE_ATENDIMENTO TR
      WHERE  PA.NU_REG_PLANO_ANS = RPA.NU_REG_PLANO_ANS
        AND  P.CD_PLANO = PA.CD_PLANO
        AND  P.CD_PLANO_PAI = PP.CD_PLANO_PAI
        AND  TR.CD_TIPO_REDE_ATENDIMENTO = PP.CD_TIPO_REDE_ATENDIMENTO
        AND  (RPA.NU_REG_PLANO_ANS = :q OR UPPER(RPA.DS_PLANO_ANS) LIKE :qlike)
    `;
    const rows = await this.oracle.query<any>(sql, { q, qlike: `%${q.toUpperCase()}%` });
    return rows.map((r) => ({
      cdTipoRedeAtendimento: r.CD_TIPO_REDE_ATENDIMENTO ?? null,
      nmComercialRede: r.NM_COMERCIAL_REDE ?? '',
      nuRegPlanoAns: r.NU_REG_PLANO_ANS,
      dsPlanoAns: r.DS_PLANO_ANS,
      cdPlano: r.CD_PLANO,
      nmPlano: r.NM_PLANO,
    }));
  }

  private async searchByRede(q: string): Promise<RedeProdutoSearchResult[]> {
    // Search by nm_comercial_rede (LIKE) or cd_tipo_rede_atendimento (exact)
    const cdRede = parseInt(q, 10);
    let sql: string;
    let binds: Record<string, any>;

    if (!isNaN(cdRede)) {
      sql = `
        SELECT P.CD_PLANO                   AS CD_PLANO,
               PP.CD_TIPO_REDE_ATENDIMENTO  AS CD_TIPO_REDE_ATENDIMENTO,
               TR.NM_COMERCIAL_REDE         AS NM_COMERCIAL_REDE,
               RPA.NU_REG_PLANO_ANS         AS NU_REG_PLANO_ANS,
               RPA.DS_PLANO_ANS             AS DS_PLANO_ANS
        FROM   TB_TIPO_REDE_ATENDIMENTO TR,
               TB_PLANO_PAI             PP,
               TB_REGISTRO_PLANO_ANS    RPA,
               TB_PLANO_ANS             PA,
               TB_PLANO                 P
        WHERE  P.CD_PLANO_PAI = PP.CD_PLANO_PAI
          AND  TR.CD_TIPO_REDE_ATENDIMENTO = PP.CD_TIPO_REDE_ATENDIMENTO
          AND  P.CD_PLANO = PA.CD_PLANO(+)
          AND  PA.NU_REG_PLANO_ANS = RPA.NU_REG_PLANO_ANS
          AND  PP.CD_TIPO_REDE_ATENDIMENTO = :cdRede
      `;
      binds = { cdRede };
    } else {
      sql = `
        SELECT P.CD_PLANO                   AS CD_PLANO,
               PP.CD_TIPO_REDE_ATENDIMENTO  AS CD_TIPO_REDE_ATENDIMENTO,
               TR.NM_COMERCIAL_REDE         AS NM_COMERCIAL_REDE,
               RPA.NU_REG_PLANO_ANS         AS NU_REG_PLANO_ANS,
               RPA.DS_PLANO_ANS             AS DS_PLANO_ANS
        FROM   TB_TIPO_REDE_ATENDIMENTO TR,
               TB_PLANO_PAI             PP,
               TB_REGISTRO_PLANO_ANS    RPA,
               TB_PLANO_ANS             PA,
               TB_PLANO                 P
        WHERE  P.CD_PLANO_PAI = PP.CD_PLANO_PAI
          AND  TR.CD_TIPO_REDE_ATENDIMENTO = PP.CD_TIPO_REDE_ATENDIMENTO
          AND  P.CD_PLANO = PA.CD_PLANO(+)
          AND  PA.NU_REG_PLANO_ANS = RPA.NU_REG_PLANO_ANS
          AND  UPPER(TR.NM_COMERCIAL_REDE) LIKE :q
      `;
      binds = { q: `%${q.toUpperCase()}%` };
    }

    const rows = await this.oracle.query<any>(sql, binds);
    return rows.map((r) => ({
      cdTipoRedeAtendimento: r.CD_TIPO_REDE_ATENDIMENTO ?? null,
      nmComercialRede: r.NM_COMERCIAL_REDE ?? '',
      cdPlano: r.CD_PLANO,
      nuRegPlanoAns: r.NU_REG_PLANO_ANS,
      dsPlanoAns: r.DS_PLANO_ANS,
    }));
  }

  private mapBeneficiarioRow(r: any): RedeProdutoSearchResult {
    return {
      cdTipoRedeAtendimento: r.CD_TIPO_REDE_ATENDIMENTO ?? null,
      nmComercialRede: r.NM_COMERCIAL_REDE ?? '',
      nmPessoa: r.NM_PESSOA,
      nuCgcCpf: r.NU_CGC_CPF,
      operadora: r.OPERADORA,
      cdPlano: r.CD_PLANO,
      nmPlano: r.NM_PLANO,
      nuRegPlanoAns: r.NU_REG_PLANO_ANS,
      cdUsuario: r.CD_USUARIO,
    };
  }
}
