/**
 * Mapa coroplético em Canvas (D3 geo + d3-zoom) para ~5.570 municípios.
 * - Geometrias projetadas uma vez por tamanho (Path2D em cache); zoom/pan só aplicam transformação.
 * - Teste de acerto por caixa delimitadora + isPointInPath (sem DOM por feição).
 * - Projeção Mercator calculada no plano (evita problemas de orientação dos anéis do TopoJSON).
 */
import { geoIdentity, geoPath } from 'd3-geo';
import { C, VIZ } from '../../styles/tokens.js';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom';
import { onResize } from '../../utils/dom.js';

const RAD = Math.PI / 180;
const mercY = (lat) => -Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * RAD) / 2)) / RAD;

function planarCoords(c, depth) {
  if (depth === 0) return [c[0], mercY(c[1])];
  return c.map((x) => planarCoords(x, depth - 1));
}
const DEPTH = { Point: 0, MultiPoint: 1, LineString: 1, MultiLineString: 2, Polygon: 2, MultiPolygon: 3 };
/** Converte geometria lon/lat em coordenadas planas Mercator (graus). Cacheado no próprio objeto. */
export function planar(geom) {
  if (!geom) return geom;
  if (geom.__planar) return geom.__planar;
  let out;
  if (geom.type === 'Feature') out = { ...geom, geometry: planar(geom.geometry) };
  else if (geom.type === 'FeatureCollection') out = { ...geom, features: geom.features.map(planar) };
  else if (geom.type === 'GeometryCollection') out = { ...geom, geometries: geom.geometries.map(planar) };
  else out = { type: geom.type, coordinates: planarCoords(geom.coordinates, DEPTH[geom.type]) };
  Object.defineProperty(geom, '__planar', { value: out, enumerable: false });
  return out;
}

export function createCanvasMap(container, { onHover = () => {}, onClick = () => {}, minZoom = 1, maxZoom = 60, ariaLabel = 'Mapa' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', ariaLabel);
  canvas.tabIndex = 0;
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const hitCtx = document.createElement('canvas').getContext('2d');

  let W = 0, H = 0, dpr = 1;
  let layers = { fills: [], lines: [] };
  let extentFeatures = null; // define o enquadramento base
  let projection = geoIdentity().reflectY(false);
  let path = geoPath(projection);
  let transform = zoomIdentity;
  let hoverId = null, selectedId = null;
  let raf = 0;
  const cache = new Map(); // feature -> { p: Path2D, b: [x0,y0,x1,y1] }

  const zoomer = d3zoom().scaleExtent([minZoom, maxZoom]).on('zoom', (ev) => { transform = ev.transform; schedule(); });
  select(canvas).call(zoomer).on('dblclick.zoom', null);

  function fit() {
    const r = container.getBoundingClientRect();
    W = Math.max(10, r.width); H = Math.max(10, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const base = extentFeatures || layers.fills[0]?.features || [];
    if (!base.length) return;
    projection = geoIdentity().fitExtent([[12, 12], [W - 12, H - 12]], { type: 'FeatureCollection', features: base.map(planar) });
    path = geoPath(projection);
    cache.clear();
    zoomer.extent([[0, 0], [W, H]]).translateExtent([[-W * 0.5, -H * 0.5], [W * 1.5, H * 1.5]]);
  }

  function geomOf(f) {
    let c = cache.get(f);
    if (!c) {
      const pf = planar(f);
      const d = path(pf);
      const b = path.bounds(pf);
      c = { p: d ? new Path2D(d) : null, b: [b[0][0], b[0][1], b[1][0], b[1][1]] };
      cache.set(f, c);
    }
    return c;
  }

  function draw() {
    raf = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const k = transform.k;
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * transform.x, dpr * transform.y);
    // recorte de visibilidade
    const vx0 = -transform.x / k, vy0 = -transform.y / k, vx1 = (W - transform.x) / k, vy1 = (H - transform.y) / k;
    for (const layer of layers.fills) {
      const sw = (layer.strokeWidth ?? 0.4) / k;
      ctx.lineJoin = 'round';
      for (const f of layer.features) {
        const g = geomOf(f);
        if (!g.p || g.b[2] < vx0 || g.b[0] > vx1 || g.b[3] < vy0 || g.b[1] > vy1) continue;
        ctx.fillStyle = layer.fill(f);
        ctx.fill(g.p);
        if (layer.stroke) { ctx.strokeStyle = layer.stroke; ctx.lineWidth = sw; ctx.stroke(g.p); }
      }
    }
    for (const line of layers.lines) {
      const d = path(planar(line.geom));
      if (!d) continue;
      ctx.strokeStyle = line.color; ctx.lineWidth = line.width / k;
      ctx.stroke(new Path2D(d));
    }
    // destaque (selecionado e hover)
    const top = layers.fills.find((l) => l.interactive);
    if (top) {
      for (const [id, color, w] of [[selectedId, C.ink, 2.4], [hoverId, C.ink, 1.6]]) {
        if (id == null) continue;
        const f = top.byId?.get(id);
        if (!f) continue;
        const g = geomOf(f);
        if (!g.p) continue;
        ctx.strokeStyle = C.white; ctx.lineWidth = (w + 2) / k; ctx.stroke(g.p);
        ctx.strokeStyle = color; ctx.lineWidth = w / k; ctx.stroke(g.p);
      }
    }
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(draw); }

  function hit(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const [x, y] = transform.invert([clientX - r.left, clientY - r.top]);
    const top = [...layers.fills].reverse().find((l) => l.interactive);
    if (!top) return null;
    for (let i = top.features.length - 1; i >= 0; i--) {
      const f = top.features[i];
      const g = geomOf(f);
      if (!g.p || x < g.b[0] || x > g.b[2] || y < g.b[1] || y > g.b[3]) continue;
      if (hitCtx.isPointInPath(g.p, x, y)) return f;
    }
    return null;
  }

  // Teclado: setas movem, + e − aproximam e afastam (o clique tem alternativa nos filtros e tabelas).
  canvas.addEventListener('keydown', (ev) => {
    const step = 60;
    const pan = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[ev.key];
    if (pan) { ev.preventDefault(); select(canvas).call(zoomer.translateBy, pan[0] / transform.k, pan[1] / transform.k); }
    else if (ev.key === '+' || ev.key === '=') { ev.preventDefault(); select(canvas).call(zoomer.scaleBy, 1.5); }
    else if (ev.key === '-' || ev.key === '_') { ev.preventDefault(); select(canvas).call(zoomer.scaleBy, 1 / 1.5); }
  });

  let downAt = null;
  canvas.addEventListener('pointermove', (ev) => {
    if (ev.buttons) return;
    const f = hit(ev.clientX, ev.clientY);
    const id = f ? f.id : null;
    canvas.style.cursor = f ? 'pointer' : 'grab';
    if (id !== hoverId) { hoverId = id; schedule(); }
    onHover(f, ev);
  });
  canvas.addEventListener('pointerleave', () => { hoverId = null; schedule(); onHover(null); });
  canvas.addEventListener('pointerdown', (ev) => { downAt = [ev.clientX, ev.clientY]; });
  canvas.addEventListener('pointerup', (ev) => {
    if (!downAt) return;
    const moved = Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]);
    downAt = null;
    if (moved > 5) return;
    const f = hit(ev.clientX, ev.clientY);
    onClick(f, ev);
  });

  function transformFor(features, pad = 24) {
    if (!features || !features.length) return zoomIdentity;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const f of features) {
      const b = path.bounds(planar(f));
      x0 = Math.min(x0, b[0][0]); y0 = Math.min(y0, b[0][1]); x1 = Math.max(x1, b[1][0]); y1 = Math.max(y1, b[1][1]);
    }
    const k = Math.max(minZoom, Math.min(maxZoom, 0.92 / Math.max((x1 - x0) / (W - pad * 2), (y1 - y0) / (H - pad * 2))));
    return zoomIdentity.translate(W / 2 - (k * (x0 + x1)) / 2, H / 2 - (k * (y0 + y1)) / 2).scale(k);
  }

  let anim = 0;
  function animateTo(t1, ms = 550) {
    cancelAnimationFrame(anim);
    const t0 = transform;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || ms <= 0) { select(canvas).call(zoomer.transform, t1); return; }
    const start = performance.now();
    const ease = (u) => 1 - Math.pow(1 - u, 3);
    const step = (now) => {
      const u = Math.min(1, (now - start) / ms), e = ease(u);
      const k = t0.k * Math.pow(t1.k / t0.k, e);
      const x = t0.x + (t1.x - t0.x) * e, y = t0.y + (t1.y - t0.y) * e;
      select(canvas).call(zoomer.transform, zoomIdentity.translate(x, y).scale(k));
      if (u < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  let focusFeatures = null;
  const off = onResize(container, () => { fit(); select(canvas).call(zoomer.transform, transformFor(focusFeatures)); schedule(); });

  return {
    canvas,
    setLayers(next, { extent } = {}) {
      layers = next;
      for (const l of layers.fills) if (l.interactive) l.byId = new Map(l.features.map((f) => [f.id, f]));
      if (extent && extent !== extentFeatures) { extentFeatures = extent; fit(); select(canvas).call(zoomer.transform, transformFor(focusFeatures)); }
      else if (!W) fit();
      schedule();
    },
    focus(features, animate = true) {
      focusFeatures = features;
      if (!W) fit();
      animateTo(transformFor(features), animate ? 550 : 0);
    },
    zoomBy(f) { select(canvas).call(zoomer.scaleBy, f); },
    setSelected(id) { selectedId = id; schedule(); },
    redraw: schedule,
    destroy() { off(); cancelAnimationFrame(raf); cancelAnimationFrame(anim); canvas.remove(); },
  };
}
