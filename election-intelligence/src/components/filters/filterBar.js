/**
 * Barra de filtros globais: eleição, turno, região, UF, município (busca), candidato, partido.
 * Os filtros persistem entre páginas e na URL.
 */
import { h, ICONS } from '../../utils/dom.js';
import { combobox, selectField } from './combobox.js';
import { segmented, toast } from '../ui/ui.js';

export function filterBar(E, store) {
  const el = h(`<div class="filterbar" role="region" aria-label="Filtros globais"><div class="filterbar__inner"></div></div>`);
  const inner = el.firstElementChild;
  const anos = [...new Set(E.meta.turnos.map((t) => t.ano))];

  const ano = selectField({ label: 'Eleição', allLabel: null, options: anos.map((a) => ({ value: String(a), label: String(a) })), value: String(E.anoDe(store.get().turno)),
    onChange: (v) => { const nr = E.nrDe(store.get().turno); const k = E.turnoByKey.has(`${v}-${nr}`) ? `${v}-${nr}` : `${v}-1`; /* pelos metadados: o arquivo do turno pode ainda não ter chegado */ store.set({ turno: k }); } });
  ano.el.classList.add('filter-field--primary-a');

  const turnoWrap = h('<div class="filter-field"><span class="label" id="lbl-turno">Turno</span></div>');
  let seg = null;
  const renderTurno = () => {
    seg?.remove();
    seg = segmented([{ value: '1', label: '1º turno' }, { value: '2', label: '2º turno' }], String(E.nrDe(store.get().turno)), (v) => store.set({ turno: `${E.anoDe(store.get().turno)}-${v}` }), 'Turno');
    seg.setAttribute('aria-labelledby', 'lbl-turno');
    turnoWrap.appendChild(seg);
  };
  renderTurno();

  const regiao = selectField({ label: 'Região', allLabel: 'Brasil', options: Object.entries(E.meta.regioes).map(([k, v]) => ({ value: k, label: v })), value: store.get().regiao, onChange: (v) => store.set({ regiao: v, uf: null, mun: null }) });
  const uf = selectField({ label: 'Estado (UF)', allLabel: 'Todas', options: [], value: store.get().uf, onChange: (v) => store.set({ uf: v, mun: null }) });
  const munOpts = (s) => {
    const out = [];
    for (let i = 0; i < E.N; i++) {
      if (s.uf && E.mun.uf[i] !== s.uf) continue;
      if (s.regiao && E.regiaoDe[i] !== s.regiao) continue;
      out.push({ value: E.mun.tse[i], label: E.mun.nome[i], hint: E.mun.uf[i], search: `${E.mun.nome[i]} ${E.mun.uf[i]}` });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  };
  const mun = combobox({ label: 'Município', placeholder: 'Buscar município…', options: munOpts(store.get()), value: store.get().mun, onChange: (v) => store.set({ mun: v }), id: 'f-mun' });
  const cand = selectField({ label: 'Candidato', allLabel: 'Todos', options: [], value: store.get().cand, onChange: (v) => store.set({ cand: v }) });
  const partido = selectField({ label: 'Partido', allLabel: 'Todos', options: [], value: store.get().partido, onChange: (v) => store.set({ partido: v }) });

  const actions = h(`<div class="filter-actions">
    <button class="btn filterbar__toggle" type="button" aria-expanded="false">${ICONS.filter}<span>Mais filtros</span></button>
    <button class="btn btn--ghost" type="button" data-act="clear" title="Limpar região, UF, município, candidato e partido">${ICONS.reset}<span>Limpar filtros</span></button>
  </div>`);

  [ano.el, turnoWrap].forEach((x) => x.classList.add('filter-field--primary'));
  inner.append(ano.el, turnoWrap, regiao.el, uf.el, mun.el, cand.el, partido.el, actions);

  actions.querySelector('[data-act=clear]').addEventListener('click', () => { store.clearFilters(); toast('Filtros limpos'); });
  const toggle = actions.querySelector('.filterbar__toggle');
  toggle.addEventListener('click', () => { const open = !el.classList.contains('is-open'); el.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); });

  let lastKey = '';
  function sync(s) {
    ano.setValue(String(E.anoDe(s.turno)));
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(E.nrDe(s.turno)))));
    regiao.setValue(s.regiao);
    uf.setOptions(E.meta.ufs.filter((u) => !s.regiao || u.regiao === s.regiao).map((u) => ({ value: u.sigla, label: `${u.sigla} · ${u.nome}` })), s.uf);
    const key = `${s.regiao}|${s.uf}`;
    if (key !== lastKey) { mun.setOptions(munOpts(s)); lastKey = key; }
    mun.setValue(s.mun);
    const ano_ = E.anoDe(s.turno);
    const cands = E.candidatosDoTurno(s.turno).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    cand.setOptions(cands.map((c) => ({ value: c.chave, label: `${c.nome} (${c.partido})` })), s.cand);
    const partidos = [...new Set(E.meta.candidatos.filter((c) => c.ano === ano_).map((c) => c.partido))].sort();
    if (s.partido && !partidos.includes(s.partido)) partidos.unshift(s.partido);
    partido.setOptions(partidos.map((p) => ({ value: p, label: p })), s.partido);
    const n = [s.regiao, s.uf, s.mun, s.cand, s.partido].filter((x) => x != null).length;
    actions.querySelector('[data-act=clear]').disabled = n === 0;
    toggle.querySelector('span').textContent = n ? `Mais filtros (${n})` : 'Mais filtros';
  }
  store.subscribe(sync);
  sync(store.get());
  return el;
}
