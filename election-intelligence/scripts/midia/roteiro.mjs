// Roteiro do vídeo de 75 segundos (item 8.4 do press kit), com os números conferidos na base
// (ver docs/divulgacao-election-intelligence/12_VERIFICACAO_MIDIA.md). Fonte única para a gravação,
// as legendas queimadas, o .srt e o .txt da locução.
export const DURACAO = 75;
export const FPS = 30;

/** Cenas: rota gravada, início e fim (s). */
export const CENAS = [
  { id: 's1', rota: '', ini: 0, fim: 8 },
  { id: 's2', rota: 'mapa', ini: 8, fim: 20 },
  { id: 's3', rota: 'turnos?uf=MG', ini: 20, fim: 38 },
  { id: 's4', rota: 'participacao', ini: 38, fim: 50 },
  { id: 's5', rota: 'perfil', ini: 50, fim: 63 },
  { id: 's6', rota: 'turnos?uf=MG', ini: 63, fim: 71 },
  { id: 'final', rota: null, ini: 71, fim: 75 },
];

/** Locução, em blocos de legenda (início e fim em segundos). */
export const LEGENDAS = [
  { ini: 0.5, fim: 7.6, texto: 'Como o Brasil votou para presidente, cidade por cidade, de 2014 a 2026.' },
  { ini: 8.3, fim: 14.0, texto: 'No 2º turno de 2026, Lula venceu em 2.875 municípios;' },
  { ini: 14.0, fim: 19.6, texto: 'Flavio Bolsonaro, em 2.695. Um município empatou.' },
  { ini: 20.5, fim: 28.5, texto: 'Em Minas, 76 cidades trocaram de vencedor entre os turnos.' },
  { ini: 28.5, fim: 37.5, texto: 'As maiores ficam na Grande BH.' },
  { ini: 38.5, fim: 49.5, texto: 'No 2º turno, a abstenção foi de 13,89% no Ceará a 26,08% no Acre.' },
  { ini: 50.5, fim: 57.5, texto: 'Com alfabetização e região no modelo, o efeito da renda cai de 8,8 para 1,7 ponto.' },
  { ini: 57.5, fim: 62.5, texto: 'Associação, não causalidade.' },
  { ini: 63.5, fim: 67.5, texto: 'Todo filtro vira um link.' },
  { ini: 67.5, fim: 74.6, texto: 'Dados do TSE e do IBGE, conferidos. Projeto aberto, não oficial.' },
];

/** Cartões de informação sobrepostos (ressalvas e números que não aparecem na tela). */
export const CARTOES = [
  { ini: 50.5, fim: 62.5, titulo: 'Efeito de dobrar o PIB per capita no voto em Lula', linhas: ['Só renda: −8,8 pontos', 'Com alfabetização e região: −1,7 ponto', 'Associação, não causalidade'], fonte: 'Regressão ponderada, 2º turno de 2026 · notebooks/analise_perfil.ipynb' },
];

export const FINAL = { endereco: 'eleicoes-presidenciais-br.vercel.app', aviso: 'Projeto independente, não oficial. Dados: TSE e IBGE.' };

/** Textos das 4 imagens (1200×630 e 1080×1350). Legenda: [chave da cor, rótulo]. */
export const IMAGENS = {
  '1_mapa_nacional_2026': {
    rota: 'mapa', alvo: '.map-wrap', kicker: 'Eleição para presidente · 2º turno de 2026',
    titulo: 'Quem venceu em cada município',
    linha: 'Lula venceu em 2.875 municípios e Flavio Bolsonaro em 2.695; 1 empatou.',
    legenda: [['lula', 'Lula (PT)'], ['flavio', 'Flavio Bolsonaro (PL)'], ['empate', 'Empate']],
    nota: 'Cor mais forte, vitória mais folgada.',
  },
  '2_minas_gerais_viradas': {
    rota: 'turnos?uf=MG', alvo: '.map-wrap', kicker: 'Minas Gerais · 1º e 2º turno de 2026',
    titulo: '76 dos 853 municípios trocaram de vencedor entre os turnos',
    linha: 'Todos de Flavio Bolsonaro para Lula. Os maiores ficam na Grande BH.',
    legenda: [['virou', 'Trocou de vencedor'], ['manteve', 'Manteve o vencedor']],
    nota: 'Nenhum dos 76 envolve empate.',
  },
  '3_abstencao_2026': {
    rota: 'participacao', alvo: { panel: 'Abstenção por UF' }, kicker: 'Abstenção no 2º turno de 2026',
    titulo: 'De 13,89% no Ceará a 26,08% no Acre',
    linha: 'Parcela dos eleitores aptos que não votou, por UF. No Brasil, 19,22%.',
    legenda: [], nota: 'Linha amarela: média do Brasil, sem o exterior.',
  },
  '4_renda_e_voto': {
    rota: 'perfil', alvo: { panel: 'Votos por faixa de PIB per capita' }, kicker: 'Renda e voto · 2º turno de 2026',
    titulo: 'Lula teve 73,9% no quarto de municípios de menor PIB per capita e 44,1% no de maior',
    linha: 'Com alfabetização e região no modelo, o efeito de dobrar o PIB per capita cai de 8,8 para 1,7 ponto.',
    legenda: [['lula', 'Lula (PT)'], ['flavio', 'Flavio Bolsonaro (PL)']],
    nota: 'Associação, não causalidade: os indicadores descrevem municípios, não eleitores.', ressalva: true,
  },
};

const hms = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
export const srt = () => LEGENDAS.map((l, i) => `${i + 1}\n${hms(l.ini)} --> ${hms(l.fim)}\n${l.texto}\n`).join('\n');
export const txt = () => ['Locução do vídeo de 75 segundos (ELECTION INTELLIGENCE)', 'Grave em ritmo calmo; os tempos são o início e o fim de cada frase.', '',
  ...CENAS.filter((c) => c.rota).map((c) => `${c.ini} a ${c.fim === 71 ? 75 : c.fim} s · tela /${c.rota}`),
  '', ...LEGENDAS.map((l) => `[${l.ini.toFixed(1)} s a ${l.fim.toFixed(1)} s] ${l.texto}`), ''].join('\n');
