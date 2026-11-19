#!/usr/bin/env node
// Compõe o vídeo de 75 s a partir das cenas gravadas por gravar.midia.js.
// Uso: FFMPEG=/caminho/do/ffmpeg node scripts/midia/compor.mjs [--voz]
//   --voz: gera também a versão de teste com voz sintética local (say, voz Luciana), para avaliação.
// Saída: docs/divulgacao-election-intelligence/assets/video/
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CENAS, LEGENDAS, CARTOES, DURACAO, FPS, srt, txt } from './roteiro.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const RAW = join(ROOT, 'test-results', 'midia-raw');
const TMP = join(RAW, 'tmp');
const OUT = join(ROOT, '..', 'docs', 'divulgacao-election-intelligence', 'assets', 'video');
const FF = process.env.FFMPEG || 'ffmpeg';
const VOZ = process.argv.includes('--voz');
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

/** Duração (s) de um arquivo de mídia, lida da saída do ffmpeg. */
function duracao(arq) {
  let saida = '';
  try { execFileSync(FF, ['-hide_banner', '-i', arq], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { saida = String(e.stderr); }
  const m = saida.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}
const ff = (args) => execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
const X264 = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', String(FPS)];
const ESCALA = (W, H) => `scale=${W}:${H}:flags=lanczos:out_range=tv:out_color_matrix=bt709,format=yuv420p`;

function cena(nome, c, info, W, H) {
  const dur = c.fim - c.ini;
  // quadros com o instante relativo ao início da cena; o último quadro antes de t0 abre a cena
  const q = info.quadros.map((x) => ({ arq: x.arq, t: x.t - info.t0 }));
  const antes = q.filter((x) => x.t <= 0).at(-1) || q[0];
  const lista = [{ arq: antes.arq, t: 0 }, ...q.filter((x) => x.t > 0 && x.t < dur)];
  const linhas = ['ffconcat version 1.0'];
  lista.forEach((x, i) => {
    const prox = i + 1 < lista.length ? lista[i + 1].t : dur;
    linhas.push(`file '${x.arq}'`, `duration ${Math.max(0.001, prox - x.t).toFixed(4)}`);
  });
  linhas.push(`file '${lista.at(-1).arq}'`);
  const arqLista = join(TMP, `${nome}-${c.id}.txt`);
  writeFileSync(arqLista, linhas.join('\n'));
  const saida = join(TMP, `${nome}-${c.id}.mp4`);
  ff(['-f', 'concat', '-safe', '0', '-i', arqLista, '-vf', `${ESCALA(W, H)},fps=${FPS}`, '-t', String(dur), ...X264, '-an', saida]);
  return saida;
}

function compor(nome, W, H) {
  const infos = JSON.parse(readFileSync(join(RAW, `cenas-${nome}.json`), 'utf8'));
  const partes = CENAS.map((c) => {
    if (!c.rota) {
      const saida = join(TMP, `${nome}-final.mp4`);
      ff(['-loop', '1', '-i', join(RAW, `${nome}-final.png`), '-vf', `${ESCALA(W, H)},fps=${FPS}`, '-t', String(c.fim - c.ini), ...X264, '-an', saida]);
      return saida;
    }
    return cena(nome, c, infos.find((x) => x.id === c.id), W, H);
  });
  const lista = join(TMP, `${nome}-partes.txt`);
  writeFileSync(lista, partes.map((p) => `file '${p}'`).join('\n'));
  const base = join(TMP, `${nome}-base.mp4`);
  ff(['-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', base]);

  // sobreposições: cartões e legendas, cada um no seu intervalo
  const sobre = [...CARTOES.map((c, i) => ({ ...c, png: join(RAW, `${nome}-cartao-${i}.png`) })), ...LEGENDAS.map((l, i) => ({ ...l, png: join(RAW, `${nome}-legenda-${i}.png`) }))];
  const entradas = ['-i', base, ...sobre.flatMap((s) => ['-i', s.png]), '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000'];
  let grafo = '', ultimo = '[0:v]';
  sobre.forEach((s, i) => {
    const out = i === sobre.length - 1 ? '[v]' : `[v${i}]`;
    grafo += `${ultimo}[${i + 1}:v]overlay=0:0:format=auto:enable='between(t,${s.ini},${s.fim})'${i === sobre.length - 1 ? ',format=yuv420p' : ''}${out};`;
    ultimo = out;
  });
  const audio = sobre.length + 1;
  const final = join(OUT, `election-intelligence_75s_${W}x${H}.mp4`);
  ff([...entradas, '-filter_complex', grafo.slice(0, -1), '-map', '[v]', '-map', `${audio}:a`, ...X264, '-c:a', 'aac', '-b:a', '128k', '-t', String(DURACAO), '-movflags', '+faststart', final]);

  if (VOZ) {
    // cada fala começa no início da legenda ou logo depois da anterior, sem sobreposição
    let livre = 0;
    const falas = LEGENDAS.map((l, i) => {
      const aiff = join(TMP, `fala-${i}.aiff`);
      execFileSync('say', ['-v', 'Luciana', '-r', '185', '-o', aiff, l.texto]);
      const dur = duracao(aiff);
      const ini = Math.max(l.ini, livre + 0.15);
      livre = ini + dur;
      return { ...l, ini, aiff };
    });
    const ins = falas.flatMap((f) => ['-i', f.aiff]);
    const mix = falas.map((f, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.round(f.ini * 1000)}|${Math.round(f.ini * 1000)}[a${i}]`).join(';');
    ff(['-i', final, ...ins, '-filter_complex', `${mix};${falas.map((_, i) => `[a${i}]`).join('')}amix=inputs=${falas.length}:normalize=0,apad[a]`, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-t', String(DURACAO), '-movflags', '+faststart', join(OUT, `election-intelligence_75s_${W}x${H}_voz_sintetica_teste.mp4`)]);
  }
  return final;
}

writeFileSync(join(OUT, 'legendas_pt-BR.srt'), srt());
writeFileSync(join(OUT, 'locucao.srt'), srt());
writeFileSync(join(OUT, 'locucao.txt'), txt());
for (const [nome, W, H] of [['horizontal', 1920, 1080], ['vertical', 1080, 1920]]) {
  const f = compor(nome, W, H);
  console.log(f.split('/').slice(-1)[0], `${(statSync(f).size / 1e6).toFixed(1)} MB`);
}
