# Validação — Hortvet 1.1.0

Data: 22/10/2026.

## Histórico e relatórios — 1.1.0

- `npm test`: **48 testes aprovados**. Incluem snapshots serializáveis, precisão preservada, IDs únicos, fuso original, filtros inclusivos, períodos invertidos, classificação antes do arredondamento, versões históricas, hashes de dependências e cobertura de caracteres das duas fontes do PDF.
- Playwright / **Chrome** e **WebKit 26.6 (perfil iPhone 13)**: inclusão manual, clique repetido, nova conversão igual, horário capturado ao converter, limpeza restrita à calculadora, exclusão com cancelamento/confirmação e remoção de todo o histórico mesmo com filtro vazio.
- IndexedDB real nos dois motores: gravação abortada não confirma sucesso; tentativa seguinte funciona com o resultado preservado. Indisponibilidade total do banco não impede a conversão e apresenta erro de salvamento. Duas abas gravam sem perda e refletem as mudanças; uma mesma ID permanece única.
- Nos dois motores, nova aba e recarga **offline** preservam o histórico. PDF e DOCX foram baixados offline inclusive no primeiro carregamento das bibliotecas e fontes. Exportar não remove registros.
- Perfil persistente do Chrome: fechar completamente e reabrir o navegador preservou o registro. Ensaio de atualização `1.1.0` → `test-1.1.1`: o aviso aguarda o usuário, as duas abas recarregam e todos os campos do snapshot permanecem idênticos; nova aba offline também conserva o histórico. Apenas o cache de arquivos antigo é removido.
- Filtros de um dia, de vários dias, sem datas, sem resultados e invertidos verificados. Tabela e relatório de impressão comparados célula a célula. Impressão esconde calculadora, filtros e controles.
- Relatórios de **7**, **2 filtrados** e **77 registros** gerados nos dois motores. Extração com pdfplumber e XML do DOCX confirmou valores, sinais, acentos, unidades, status e linhas idênticas entre PDF, DOCX e impressão. Casos `−0,5119` e `−0,5361` mantêm o status fora da faixa.
- PDF: A4 retrato, 1 e 5 páginas, fonte Lato incorporada, cabeçalhos repetidos e linhas completas. DOCX verdadeiro, tabela editável, A4 retrato, cabeçalho repetido e `cantSplit` nas linhas; renderizado com LibreOffice, 1 e 4 páginas na versão final. Todas as páginas dos relatórios multipágina foram inspecionadas visualmente; a nota final fica inteira.
- Layout conferido em **320, 390, 768 e 1280 px**, sem rolagem horizontal; campos de data com fonte de 16 px e tabela adaptada ao celular sem perder cabeçalhos acessíveis. Capturas finais de desktop e celular inspecionadas.
- Regressão da calculadora aprovada em Chrome e WebKit. **axe-core 4.14.0:** zero violações nos dez cenários de 390/1280 px com histórico presente, estados da calculadora e seções de suporte abertas. Automação não equivale a validação com leitor de tela físico.
- Dependências com versões fixadas e licenças locais; `npm audit` na instalação não apontou vulnerabilidades. O service worker inclui todos os módulos, fontes e bibliotecas dos relatórios.

### Reproduzir os ensaios

Use perfis de teste isolados: `scripts/history-checks.js` limpa e preenche o banco do perfil com dados fictícios.

- `playwright-cli -s=<perfil> --raw run-code --filename scripts/history-checks.js`
- `scripts/browser-checks.js`: regressão da calculadora; `scripts/accessibility-checks.js`: axe-core.
- `python scripts/check-reports.py`: compara os arquivos gerados em `output/reports/`, usando pdfplumber.
- `node scripts/update-test-server.mjs`: servidor de ensaio na porta 4174. Em perfil persistente, adicionar `−0,5119`, fechar/reabrir o navegador e executar `scripts/update-history-checks.js`.
- Renderização: `render_docx.py <arquivo.docx> --output_dir <pasta> --emit_pdf`; PDF via `pdftoppm`. Imagens e arquivos fictícios ficam em `output/`, fora do Git.

### Publicação 1.1.0

- [Deployment concluído](https://github.com/mrxandejp/conversor-Hortvet/actions/runs/39852128002), aplicação no commit `eb221d7`.
- [Site público](https://mrxandejp.github.io/conversor-Hortvet/) com versão 1.1.0; **30 arquivos públicos** conferidos byte a byte contra os arquivos locais.
- A suíte completa de histórico foi repetida no endereço público em Chrome com perfil **Pixel 7** e WebKit com perfil **iPhone 13**, sem erros JavaScript: gravação, filtros, falhas, duas abas, persistência, exportação offline e downloads PDF/DOCX de uma e várias páginas.
- Os arquivos baixados do site público passaram novamente pela comparação de todas as células de PDF, Word e impressão. Nenhuma medição de teste foi enviada a servidor; os dados fictícios existem somente nos perfis isolados de automação.

### Aparelhos físicos — histórico e exportação pendentes

- [ ] Android / Chrome instalado: adicionar medições, fechar, reabrir offline e confirmar persistência.
- [ ] Android: salvar PDF e DOCX em Arquivos/Downloads, abrir os documentos, conferir acentos/sinais e imprimir.
- [ ] iPhone / Safari e app da tela inicial: adicionar medições, fechar, reabrir offline e confirmar persistência.
- [ ] iPhone: salvar/compartilhar PDF e DOCX em Arquivos, abrir os documentos e imprimir via AirPrint.
- [ ] Ambos: aplicar período e conferir as mesmas linhas na tabela e nos documentos; cancelar impressão sem perder dados; testar o link de download alternativo.
- [ ] TalkBack / VoiceOver: filtros, cabeçalhos da tabela, mensagens de salvamento e confirmações de exclusão.

Os testes automatizados não confirmam download, instalação ou impressão nos aparelhos físicos.

## Evidências anteriores — 1.0.0

### Automatizada

- `npm test`: **38 testes passaram**, sem falhas, em Node.js 24.11.0. Conversão, classificação antes do arredondamento, limites inclusivos, precisão decimal, entradas inválidas, conteúdo da cópia, cache offline, isolamento entre apps, atualização, falha de download e manifesto/PNGs.
- Playwright / Chrome desktop e perfil **Pixel 7**: fluxo completo aprovado, com leitura e escrita real da área de transferência.
- Playwright / **WebKit 26.6**, perfil **iPhone 13**: fluxo completo aprovado. A cópia manual de contingência foi validada; integração física da área de transferência do iPhone continua no roteiro abaixo.
- Ambos os perfis móveis: sete casos de conversão/classificação, entradas inválidas, botão de sinal, ponto/vírgula, Enter, cálculo completo, anúncio acessível, limpeza, invalidação ao editar, cópia manual, instalação e referências.
- Ambos os motores reabriram uma **nova aba offline** e converteram `−0,483 °C` em `−0,500 °H`, com classificação acima da faixa. Nenhuma leitura em localStorage ou sessionStorage; nenhum erro JavaScript durante os fluxos.
- Layout sem rolagem horizontal em 320, 390, 768 e 1280 pixels CSS. Inspeção visual de capturas desktop e mobile.
- **axe-core 4.14.0**: zero violações automáticas nas regras WCAG 2 A/AA, WCAG 2.1 AA e boas práticas, em dez cenários (390 e 1280 px; vazio, inválido, dentro, acima e abaixo da faixa, com instalação e referências abertas). Isso não substitui testes com leitores de tela reais.
- Atualização real de service worker em servidor local de ensaio: uma segunda versão exibiu o aviso, preservou a leitura até clicar em Atualizar, recarregou duas abas abertas e removeu apenas o cache anterior do aplicativo. As fontes publicadas não foram alteradas para esse ensaio.

### Publicação inicial verificada

- [Site em HTTPS](https://mrxandejp.github.io/conversor-Hortvet/), a partir de `main` → `/docs`.
- [Build e deployment inicial concluídos com sucesso](https://github.com/mrxandejp/conversor-Hortvet/actions/runs/39846518159), código da aplicação no commit `aca0b4d`.
- Os **12 arquivos públicos** retornaram conteúdo idêntico aos arquivos locais testados.
- A suíte de navegador foi repetida no **endereço publicado**, em Chrome com perfil Pixel 7: conversão, interpretação, validação, cópia, navegação, tamanhos de tela e reabertura offline aprovados; nenhum erro JavaScript.

Scripts reproduzíveis: `scripts/browser-checks.js` e `scripts/accessibility-checks.js`, executados via `playwright-cli --raw run-code --filename <arquivo>` em uma sessão aberta. O segundo requer o pacote axe-core extraído em `output/playwright/package/axe.min.js`:

```sh
mkdir -p output/playwright
npm pack axe-core@4.14.0 --pack-destination output/playwright --silent
tar -xzf output/playwright/axe-core-4.14.0.tgz -C output/playwright package/axe.min.js
```

Capturas e saídas locais em `output/playwright/` são ignoradas pelo Git. Os scripts de verificação ficam versionados; nenhuma dependência de auditoria é distribuída com o site.

### Aparelhos reais — roteiro original pendente

Emulação de navegador não confirma instalação e funcionamento em aparelhos físicos.

- [ ] Android: abrir o link no Chrome, instalar e abrir pelo ícone.
- [ ] Android: digitar `-0,524`, conferir `−0,543 °H` e copiar o resultado.
- [ ] Android: aguardar “Pronto para usar offline”, fechar, ativar modo avião e reabrir pelo ícone; converter novamente.
- [ ] iPhone: abrir no Safari, adicionar à Tela de Início e abrir pelo ícone.
- [ ] iPhone: inserir o sinal pelo botão `−`, digitar com teclado decimal e copiar o resultado.
- [ ] iPhone: aguardar “Pronto para usar offline”, fechar, ativar modo avião e reabrir pelo ícone; converter novamente.
- [ ] Conferir o uso com TalkBack e VoiceOver, tamanho de texto ampliado e contraste sob iluminação de campo.

Nenhuma validação física foi presumida ou marcada como concluída.
