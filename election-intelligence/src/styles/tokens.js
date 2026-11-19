/**
 * Tokens de cor usados pelo JavaScript (gráficos, mapas, cartogramas).
 * Espelham as variáveis de src/styles/tokens.css — qualquer cor nova entra nos dois arquivos
 * e em DESIGN.md. As páginas não devem declarar hexadecimais próprios.
 */
export const C = {
  navy900: '#001a4f',
  navy800: '#002776',
  navy700: '#12398f',
  navy100: '#e6ecf7',
  green700: '#007a2e',
  green600: '#009c3b',
  gold500: '#e3b505',
  gold100: '#fbf3d2',
  white: '#ffffff',
  ink: '#0c1524', // gray-950
  gray900: '#172133',
  gray700: '#3d4859',
  gray600: '#5b6676',
  gray500: '#5f6978', // texto terciário (≥ 4,5:1 sobre o fundo)
  gray400: '#a3abb7',
  gray300: '#c9ced6',
  gray200: '#e3e6eb',
  gray100: '#eef0f3',
  negative: '#b42318',
};

/** Papéis semânticos de dados (mapas, legendas, gráficos). */
export const VIZ = {
  noData: '#dfe3e8', // município sem votos / sem dado
  outOfScope: '#e9ecf1', // fora do recorte territorial
  tie: '#8a8f98', // empate entre vencedores
  changed: C.gold500, // mudou / virou
  unchanged: C.gray300, // manteve
  abstention: C.navy800,
  blank: C.gold500,
  null: '#6b7a8f',
  // categorias de "mudança de partido × candidato"
  sameAll: '#9aa3ae',
  sameParty: '#3a7dc9',
  sameCandidate: '#0f7b6c',
  // regiões (linhas e pontos)
  region: { N: '#0f7b6c', NE: '#b8892b', SE: C.navy800, S: '#3a7dc9', CO: '#7b3fa0' },
  // série categórica genérica (tema do relatório "Eleições BR")
  series: [C.navy800, C.green600, C.gold500, '#3a7dc9', '#0f7b6c', '#6b7a8f', '#7fb3e6', '#5faf6b', '#b8892b'],
  // rampas sequenciais e divergente
  rampAbstention: ['#f3f6fb', '#c8d6ee', '#7f9fd6', '#3a62b0', C.navy800],
  rampMargin: ['#f2f4f8', '#bfcbe2', '#6f88bd', '#2a4c93', C.navy900],
  rampDiverge: [C.negative, '#f1a99f', '#f6f7f9', '#9ec1ef', C.navy800],
};

export const FONT_SANS = "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
