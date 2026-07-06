/**
 * Mapeamento de cidades brasileiras → UF para o mapa de conquistas.
 * Cobre capitais e cidades grandes/médias. Para cidades fora da lista,
 * o usuário pode escrever "Cidade - UF" (ou "Cidade/UF") no campo cidade
 * do abastecimento, que o estado é extraído do sufixo.
 */

export const UF_NAMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

/** Remove acentos, minúsculas, espaços duplicados. */
export function normalizeCityName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const CITY_TO_UF: Record<string, string> = {
  // AC
  'rio branco': 'AC', 'cruzeiro do sul': 'AC',
  // AL
  'maceio': 'AL', 'arapiraca': 'AL',
  // AP
  'macapa': 'AP', 'santana': 'AP',
  // AM
  'manaus': 'AM', 'parintins': 'AM', 'itacoatiara': 'AM',
  // BA
  'salvador': 'BA', 'feira de santana': 'BA', 'vitoria da conquista': 'BA', 'camacari': 'BA',
  'itabuna': 'BA', 'ilheus': 'BA', 'juazeiro': 'BA', 'lauro de freitas': 'BA',
  'barreiras': 'BA', 'porto seguro': 'BA', 'paulo afonso': 'BA', 'eunapolis': 'BA',
  // CE
  'fortaleza': 'CE', 'caucaia': 'CE', 'juazeiro do norte': 'CE', 'maracanau': 'CE',
  'sobral': 'CE', 'crato': 'CE', 'jericoacoara': 'CE',
  // DF
  'brasilia': 'DF', 'taguatinga': 'DF', 'ceilandia': 'DF', 'gama': 'DF',
  // ES
  'vitoria': 'ES', 'vila velha': 'ES', 'serra': 'ES', 'cariacica': 'ES',
  'cachoeiro de itapemirim': 'ES', 'guarapari': 'ES', 'linhares': 'ES',
  // GO
  'goiania': 'GO', 'aparecida de goiania': 'GO', 'anapolis': 'GO', 'rio verde': 'GO',
  'luziania': 'GO', 'valparaiso de goias': 'GO', 'caldas novas': 'GO', 'catalao': 'GO',
  'itumbiara': 'GO', 'jatai': 'GO', 'pirenopolis': 'GO',
  // MA
  'sao luis': 'MA', 'imperatriz': 'MA', 'caxias': 'MA', 'timon': 'MA', 'codo': 'MA',
  'barreirinhas': 'MA',
  // MT
  'cuiaba': 'MT', 'varzea grande': 'MT', 'rondonopolis': 'MT', 'sinop': 'MT',
  'sorriso': 'MT', 'barra do garcas': 'MT', 'chapada dos guimaraes': 'MT',
  // MS
  'campo grande': 'MS', 'dourados': 'MS', 'tres lagoas': 'MS', 'corumba': 'MS',
  'ponta pora': 'MS', 'bonito': 'MS',
  // MG
  'belo horizonte': 'MG', 'uberlandia': 'MG', 'contagem': 'MG', 'juiz de fora': 'MG',
  'betim': 'MG', 'montes claros': 'MG', 'ribeirao das neves': 'MG', 'uberaba': 'MG',
  'governador valadares': 'MG', 'ipatinga': 'MG', 'sete lagoas': 'MG', 'divinopolis': 'MG',
  'santa luzia': 'MG', 'pocos de caldas': 'MG', 'patos de minas': 'MG', 'pouso alegre': 'MG',
  'teofilo otoni': 'MG', 'barbacena': 'MG', 'sabara': 'MG', 'varginha': 'MG',
  'conselheiro lafaiete': 'MG', 'araguari': 'MG', 'itabira': 'MG', 'passos': 'MG',
  'coronel fabriciano': 'MG', 'muriae': 'MG', 'ituiutaba': 'MG', 'araxa': 'MG',
  'lavras': 'MG', 'ouro preto': 'MG', 'tiradentes': 'MG', 'sao joao del rei': 'MG',
  'diamantina': 'MG', 'monte verde': 'MG', 'capitolio': 'MG', 'extrema': 'MG',
  'vespasiano': 'MG', 'lagoa santa': 'MG', 'pedro leopoldo': 'MG', 'nova lima': 'MG',
  'itabirito': 'MG', 'esmeraldas': 'MG', 'ibirite': 'MG', 'vicosa': 'MG',
  // PA
  'belem': 'PA', 'ananindeua': 'PA', 'santarem': 'PA', 'maraba': 'PA',
  'parauapebas': 'PA', 'castanhal': 'PA', 'abaetetuba': 'PA', 'altamira': 'PA',
  'tucurui': 'PA', 'alter do chao': 'PA',
  // PB
  'joao pessoa': 'PB', 'campina grande': 'PB', 'santa rita': 'PB', 'patos': 'PB',
  'bayeux': 'PB', 'sousa': 'PB', 'cajazeiras': 'PB',
  // PR
  'curitiba': 'PR', 'londrina': 'PR', 'maringa': 'PR', 'ponta grossa': 'PR',
  'cascavel': 'PR', 'sao jose dos pinhais': 'PR', 'foz do iguacu': 'PR', 'colombo': 'PR',
  'guarapuava': 'PR', 'paranagua': 'PR', 'araucaria': 'PR', 'toledo': 'PR',
  'apucarana': 'PR', 'pinhais': 'PR', 'campo largo': 'PR', 'umuarama': 'PR',
  'cambe': 'PR', 'morretes': 'PR',
  // PE
  'recife': 'PE', 'jaboatao dos guararapes': 'PE', 'olinda': 'PE', 'caruaru': 'PE',
  'petrolina': 'PE', 'paulista': 'PE', 'cabo de santo agostinho': 'PE', 'camaragibe': 'PE',
  'garanhuns': 'PE', 'vitoria de santo antao': 'PE', 'porto de galinhas': 'PE',
  'ipojuca': 'PE', 'gravata': 'PE',
  // PI
  'teresina': 'PI', 'parnaiba': 'PI', 'picos': 'PI', 'piripiri': 'PI', 'floriano': 'PI',
  // RJ
  'rio de janeiro': 'RJ', 'sao goncalo': 'RJ', 'duque de caxias': 'RJ', 'nova iguacu': 'RJ',
  'niteroi': 'RJ', 'belford roxo': 'RJ', 'sao joao de meriti': 'RJ',
  'campos dos goytacazes': 'RJ', 'petropolis': 'RJ', 'volta redonda': 'RJ', 'mage': 'RJ',
  'itaborai': 'RJ', 'macae': 'RJ', 'cabo frio': 'RJ', 'angra dos reis': 'RJ',
  'nova friburgo': 'RJ', 'barra mansa': 'RJ', 'teresopolis': 'RJ', 'mesquita': 'RJ',
  'nilopolis': 'RJ', 'resende': 'RJ', 'queimados': 'RJ', 'buzios': 'RJ',
  'arraial do cabo': 'RJ', 'paraty': 'RJ', 'saquarema': 'RJ', 'marica': 'RJ',
  // RN
  'natal': 'RN', 'mossoro': 'RN', 'parnamirim': 'RN', 'sao goncalo do amarante': 'RN',
  'macaiba': 'RN', 'caico': 'RN', 'pipa': 'RN',
  // RS
  'porto alegre': 'RS', 'caxias do sul': 'RS', 'pelotas': 'RS', 'canoas': 'RS',
  'santa maria': 'RS', 'gravatai': 'RS', 'viamao': 'RS', 'novo hamburgo': 'RS',
  'sao leopoldo': 'RS', 'rio grande': 'RS', 'alvorada': 'RS', 'passo fundo': 'RS',
  'sapucaia do sul': 'RS', 'uruguaiana': 'RS', 'santa cruz do sul': 'RS',
  'cachoeirinha': 'RS', 'bage': 'RS', 'bento goncalves': 'RS', 'erechim': 'RS',
  'guaiba': 'RS', 'gramado': 'RS', 'canela': 'RS', 'torres': 'RS',
  // RO
  'porto velho': 'RO', 'ji-parana': 'RO', 'ariquemes': 'RO', 'vilhena': 'RO', 'cacoal': 'RO',
  // RR
  'boa vista': 'RR', 'rorainopolis': 'RR',
  // SC
  'florianopolis': 'SC', 'joinville': 'SC', 'blumenau': 'SC', 'sao jose': 'SC',
  'chapeco': 'SC', 'itajai': 'SC', 'criciuma': 'SC', 'jaragua do sul': 'SC',
  'palhoca': 'SC', 'lages': 'SC', 'balneario camboriu': 'SC', 'brusque': 'SC',
  'tubarao': 'SC', 'sao bento do sul': 'SC', 'navegantes': 'SC', 'bombinhas': 'SC',
  'garopaba': 'SC', 'penha': 'SC', 'sao joaquim': 'SC', 'urubici': 'SC',
  // SP
  'sao paulo': 'SP', 'guarulhos': 'SP', 'campinas': 'SP', 'sao bernardo do campo': 'SP',
  'santo andre': 'SP', 'osasco': 'SP', 'sao jose dos campos': 'SP', 'ribeirao preto': 'SP',
  'sorocaba': 'SP', 'santos': 'SP', 'maua': 'SP', 'sao jose do rio preto': 'SP',
  'mogi das cruzes': 'SP', 'diadema': 'SP', 'jundiai': 'SP', 'piracicaba': 'SP',
  'carapicuiba': 'SP', 'bauru': 'SP', 'itaquaquecetuba': 'SP', 'sao vicente': 'SP',
  'franca': 'SP', 'praia grande': 'SP', 'guaruja': 'SP', 'taubate': 'SP',
  'limeira': 'SP', 'suzano': 'SP', 'taboao da serra': 'SP', 'sumare': 'SP',
  'barueri': 'SP', 'embu das artes': 'SP', 'sao carlos': 'SP', 'marilia': 'SP',
  'indaiatuba': 'SP', 'cotia': 'SP', 'americana': 'SP', 'jacarei': 'SP',
  'araraquara': 'SP', 'itu': 'SP', 'presidente prudente': 'SP', 'hortolandia': 'SP',
  'rio claro': 'SP', 'aracatuba': 'SP', 'ferraz de vasconcelos': 'SP',
  "santa barbara d'oeste": 'SP', 'sao caetano do sul': 'SP', 'francisco morato': 'SP',
  'itapevi': 'SP', 'mogi guacu': 'SP', 'pindamonhangaba': 'SP',
  'itapecerica da serra': 'SP', 'braganca paulista': 'SP', 'sao roque': 'SP',
  'ubatuba': 'SP', 'caraguatatuba': 'SP', 'sao sebastiao': 'SP', 'ilhabela': 'SP',
  'campos do jordao': 'SP', 'atibaia': 'SP', 'valinhos': 'SP', 'vinhedo': 'SP',
  'paulinia': 'SP', 'salto': 'SP', 'botucatu': 'SP', 'jau': 'SP', 'ourinhos': 'SP',
  'assis': 'SP', 'catanduva': 'SP', 'barretos': 'SP', 'votuporanga': 'SP',
  'holambra': 'SP', 'brotas': 'SP', 'olimpia': 'SP', 'aguas de lindoia': 'SP',
  'serra negra': 'SP', 'socorro': 'SP',
  // SE
  'aracaju': 'SE', 'nossa senhora do socorro': 'SE', 'lagarto': 'SE', 'itabaiana': 'SE',
  // TO
  'palmas': 'TO', 'araguaina': 'TO', 'gurupi': 'TO', 'porto nacional': 'TO',
  'jalapao': 'TO',
};

const VALID_UFS = new Set(Object.keys(UF_NAMES));

/**
 * Resolve a UF de uma cidade digitada livremente.
 * 1º tenta sufixo explícito ("Campinas - SP", "Campinas/SP", "Campinas, SP");
 * 2º cai no dicionário de cidades conhecidas.
 */
export function resolveCityUF(raw: string): { city: string; uf: string | null } {
  const trimmed = raw.trim();

  // Sufixo explícito: separador (-, /, vírgula) + 2 letras no fim
  const suffixMatch = trimmed.match(/^(.*?)[\s]*[-/,][\s]*([A-Za-z]{2})$/);
  if (suffixMatch) {
    const uf = suffixMatch[2].toUpperCase();
    if (VALID_UFS.has(uf)) {
      return { city: suffixMatch[1].trim(), uf };
    }
  }

  const normalized = normalizeCityName(trimmed);
  return { city: trimmed, uf: CITY_TO_UF[normalized] || null };
}
