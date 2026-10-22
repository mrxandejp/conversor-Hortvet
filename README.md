# Hortvet

Calculadora instalável e offline para converter o ponto de congelamento de Celsius para Hortvet e comparar o índice crioscópico do **leite bovino cru refrigerado** com a faixa federal geral da IN 76/2018.

**Site:** https://mrxandejp.github.io/conversor-Hortvet/

## Usar

Digite uma leitura negativa do crioscópio ou laudo, como `-0,524` ou `-0.524`. O botão `−` insere o sinal no teclado do celular. Toque em **Converter**. O resultado é `−0,543 °H`; **Ver cálculo** mostra `−0,54266488 °H`. **Copiar resultado** inclui a leitura original, interpretação, fórmula e referência.

O termômetro comum não fornece o índice crioscópico. O resultado não determina isoladamente segurança para consumo, acidez, qualidade microbiológica ou fraude. A comparação numérica não incorpora incerteza de medição nem substitui a avaliação do laboratório.

### Instalar e usar offline

- **Android / Chrome:** menu ⋮ → Instalar app ou Adicionar à tela inicial.
- **iPhone / Safari:** Compartilhar → Adicionar à Tela de Início; ativar Abrir como App da Web quando oferecido.
- Aguarde **Pronto para usar offline** com internet antes do primeiro uso desconectado. O cache pode ser removido pelo navegador ou ao limpar os dados do site; nesse caso, abra novamente com internet.
- Leituras ficam apenas na memória da página. Não há histórico, contas, analytics nem transmissão de medições. O GitHub Pages mantém seus próprios registros de acesso à hospedagem.
- Uma nova versão é baixada quando há conexão. O aviso de atualização permite recarregar; a leitura atual é descartada. Outros separadores abertos também recarregam para manter código e referências consistentes.

## Regras e precisão

- Conversão: `°H = °C × 1,03562`, preservando o sinal.
- Classificação inclusiva pelo **Celsius original**, antes de arredondar: `−0,536 ≤ °C ≤ −0,512`.
- Maior que `−0,512 °C`: acima da faixa, possível diluição a investigar; não comprova adição de água.
- Menor que `−0,536 °C`: abaixo da faixa, investigar com o laboratório.
- As equivalências legais em Hortvet são aproximadas. `−0,5119 °C`, por exemplo, é classificado acima da faixa embora o resultado arredonde para `−0,530 °H`.
- Aritmética decimal exata com `BigInt`; arredondamento para três casas pelo critério de metade para longe de zero. Limites nunca são avaliados no valor arredondado.
- Aceita uma representação decimal com dígitos, um separador vírgula ou ponto e sinal negativo (`-` ou `−`), com até 40 caracteres. Espaços externos são removidos. Rejeita zero, positivos, notação científica, unidades, texto e separadores misturados. Nunca interpreta `524` como `−0,524`.
- Referência geral, sem exceções regionais e sem extensão para leite caprino, UHT ou outros produtos.

## Desenvolvimento

Sem dependências de produção ou etapa de build. Node.js 22+ para desenvolvimento e testes:

```sh
npm test
npm start
```

Abra http://127.0.0.1:4173/conversor-Hortvet/. O servidor usa a mesma subpasta da publicação. Service workers precisam de HTTPS ou localhost; não testar a PWA por `file://`.

`docs/` contém somente os arquivos públicos. `conversion.js` separa as regras da interface; `pwa.js` gerencia instalação e atualização; `sw.js` mantém um cache por versão e escopo, sem interferir em outros sites do mesmo domínio. Os testes cobrem cálculo, validação, fronteiras, cópia, cache, isolamento e manifesto/ícones.

Os PNGs de instalação são derivados do ícone vetorial local. Para regenerar no macOS: `swift scripts/render-icons.swift`. Os PNGs já estão versionados e não exigem Swift para executar o site.

### Publicação

GitHub Pages publica `main` → `/docs`, com `.nojekyll`. Rodar `npm test` antes de publicar. Toda alteração em um arquivo de `docs/` deve incrementar `VERSION` em `docs/sw.js`; atualizar também a versão exibida e `package.json` quando lançar uma versão. Confirmar que a nova versão aparece online e reabre offline.

O uso de cache mantém a versão instalada até uma atualização; mudanças regulatórias exigem revisão das fontes, código e versão. A página identifica a data de revisão. A publicação não altera os limites automaticamente.

## Fontes

Revisadas em **22/10/2026**:

1. [MAPA — IN 76/2018, art. 5º, IX](https://www.gov.br/agricultura/pt-br/assuntos/inspecao/produtos-animal/legislacao/IN762018RTIQLeite.pdf): faixa atual adotada.
2. [Embrapa — Qualidade físico-química, higiênico-sanitária e composicional do leite cru, 2014, p. 12](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1018827/1/Doc158leite.pdf): fator 1,03562. Os limites históricos da IN 62 presentes no documento **não** são usados na aplicação.
3. [Embrapa — Crioscopia](https://www.embrapa.br/en/web/agencia-de-informacao-tecnologica/criacoes/gado_de_leite/pre-producao/qualidade-e-seguranca/qualidade/testes-de-qualidade/crioscopia): relação entre água e ponto de congelamento.

Veja [VALIDATION.md](VALIDATION.md) para evidências e os testes físicos ainda pendentes.
