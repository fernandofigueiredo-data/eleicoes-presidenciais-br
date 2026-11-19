# PRODUCT.md — ELECTION INTELLIGENCE

## Público

- Jornalistas e analistas que precisam do resultado oficial por território, rápido e conferível.
- Estudantes e pesquisadores que comparam eleições, turnos e perfis de município.
- Leitores interessados, no celular, a partir de um link compartilhado.

## Tarefas principais (modo "operar")

1. Ver quem venceu, por quanto, num turno e num recorte (Brasil, região, UF, município).
2. Achar um município pelo nome e ver o resultado dele.
3. Comparar candidatos, territórios, eleições e turnos.
4. Exportar os números (CSV) e compartilhar a visão (link com filtros).
5. Conferir de onde vem cada número e se ele bate com a fonte.

## Restrições

- Os números têm de ser idênticos aos do relatório Power BI (validação contra o PBIX-MCP).
- Sem inferências que os dados não sustentam: nada de transferência de votos entre turnos, nada de causalidade.
- Site estático, independente do Power BI, publicável em GitHub Pages, Netlify ou Vercel.
- Português do Brasil; formatos numéricos pt-BR.
- Identidade herdada do relatório: navy `#002776`, verde `#009C3B`, dourado `#E3B505`, cores de partido do modelo.
