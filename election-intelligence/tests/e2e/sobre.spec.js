// Página "Sobre e contato" (/sobre): aviso, contato, como citar e perguntas frequentes.
import { test, expect } from '@playwright/test';

const EMAIL = 'fernandofigueiredo123@gmail.com';
const SITE = 'https://eleicoes-presidenciais-br.vercel.app/';

async function abrir(page, rota = 'sobre') {
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  await page.goto('/' + rota);
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator('.page-title')).toBeVisible();
  return erros;
}
const lerClipboard = (page) => page.evaluate(() => navigator.clipboard.readText());

for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`Sobre e contato em ${vp.width} px`, () => {
    test.use({ viewport: vp });
    test('abre sem erro e o aviso de projeto não oficial aparece sem rolagem', async ({ page }) => {
      const erros = await abrir(page);
      await expect(page.locator('.page-title')).toHaveText('Sobre o projeto, fontes e contato');
      const aviso = page.locator('#sec-aviso');
      await expect(aviso).toContainText('Não é fonte oficial do Tribunal Superior Eleitoral (TSE) nem do IBGE');
      await expect(aviso).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await expect(aviso.getByRole('link', { name: 'resultados.tse.jus.br' })).toHaveAttribute('href', 'https://resultados.tse.jus.br/');
      await expect(aviso.getByRole('link', { name: 'dadosabertos.tse.jus.br' })).toHaveAttribute('href', 'https://dadosabertos.tse.jus.br/');
      // seções na ordem pedida
      const ids = await page.locator('main [id^="sec-"]').evaluateAll((els) => els.map((e) => e.id));
      expect(ids.slice(0, 9)).toEqual(['sec-aviso', 'sec-o-que-e', 'sec-contato', 'sec-dados', 'sec-citar', 'sec-metodologia', 'sec-faq', 'sec-licencas', 'sec-privacidade']);
      // hierarquia de títulos: um h1, seções em h2
      await expect(page.locator('main h1')).toHaveCount(1);
      // privacidade descreve o que é medido (hoje: nada)
      await expect(page.getByTestId('privacidade')).toContainText('não usa cookies');
      await expect(page.getByTestId('privacidade')).toContainText('não mede acessos');
      expect(await page.locator('main h2').count()).toBeGreaterThan(8);
      expect(erros).toEqual([]);
    });
  });
}

test.describe('contato e citação', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('mailto aponta para o e-mail do projeto, com assunto, e o botão copia o e-mail', async ({ page }) => {
    await abrir(page);
    const link = page.getByTestId('email-link');
    await expect(link).toHaveText(EMAIL);
    await expect(link).toHaveAttribute('href', `mailto:${EMAIL}?subject=Contato%20sobre%20o%20ELECTION%20INTELLIGENCE`);
    await page.getByRole('button', { name: `Copiar e-mail ${EMAIL}` }).click();
    await expect(page.locator('.toast')).toContainText('E-mail copiado');
    expect(await lerClipboard(page)).toBe(EMAIL);
  });

  test('os três formatos de citação existem e copiam o texto esperado, com a data de acesso do visitante', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-27T10:00:00'));
    await abrir(page, 'sobre?s=citar');
    const esperado = {
      fonte: `Fonte: TSE e IBGE. Elaboração: ELECTION INTELLIGENCE (${SITE}).`,
      abnt: `FIGUEIREDO, Fernando. ELECTION INTELLIGENCE: análise eleitoral brasileira. [S. l.], 2026. Disponível em: ${SITE}. Acesso em: 27 nov. 2026.`,
      curta: 'Dados do TSE e do IBGE, via ELECTION INTELLIGENCE (eleicoes-presidenciais-br.vercel.app).',
    };
    await expect(page.locator('#sec-citar')).toBeInViewport();
    for (const [id, texto] of Object.entries(esperado)) {
      await expect(page.getByTestId(`cite-${id}`)).toHaveText(texto);
      await page.locator(`#sec-citar [data-copy="${id}"]`).click();
      expect(await lerClipboard(page)).toBe(texto);
    }
  });

  test('teclado: o botão de copiar recebe foco visível e funciona com Enter', async ({ page }) => {
    await abrir(page);
    const btn = page.locator('#sec-citar [data-copy="fonte"]');
    await btn.focus();
    await expect(btn).toBeFocused();
    const outline = await btn.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');
    await page.keyboard.press('Enter');
    expect(await lerClipboard(page)).toContain('Fonte: TSE e IBGE.');
  });
});

test('FAQ: nota sobre 212, 213 e 215 aberta, com tabela e CSV para baixar', async ({ page }) => {
  await abrir(page, 'sobre?s=faq');
  const nota = page.locator('#faq-viradas');
  await expect(nota).toHaveAttribute('open', '');
  await expect(nota).toContainText('212 municípios trocaram de vencedor entre os turnos');
  await expect(nota).toContainText('Não explicado');
  await expect(nota.locator('table tbody tr')).toHaveCount(3);
  const href = await nota.getByRole('link', { name: /Baixar a lista/ }).getAttribute('href');
  const r = await page.request.get(href.replace(/^\.\//, '/'));
  expect(r.ok()).toBe(true);
  const linhas = (await r.text()).trim().split(/\r?\n/);
  expect(linhas).toHaveLength(216); // cabeçalho + 215 municípios
});

test('o link do rodapé leva à seção de citação e o menu mostra "Sobre e contato"', async ({ page }) => {
  await abrir(page, 'mapa');
  await page.locator('footer').getByRole('link', { name: 'Como citar' }).click();
  await expect(page).toHaveURL(/\/sobre\?s=citar$/);
  await expect(page.locator('#sec-citar')).toBeInViewport();
  await page.locator('.tab[data-page="nacional"]').click();
  await expect(page).not.toHaveURL(/s=citar/);
});
