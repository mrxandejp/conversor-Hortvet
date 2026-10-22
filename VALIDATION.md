# Validação — Hortvet 1.0.0

Data: 22/10/2026.

## Automatizada

- `npm test`: **38 testes passaram**, sem falhas, em Node.js 24.11.0. Conversão, classificação antes do arredondamento, limites inclusivos, precisão decimal, entradas inválidas, conteúdo da cópia, cache offline, isolamento entre apps, atualização, falha de download e manifesto/PNGs.
- Playwright / Chrome desktop e perfil **Pixel 7**: fluxo completo aprovado, com leitura e escrita real da área de transferência.
- Playwright / **WebKit 26.6**, perfil **iPhone 13**: fluxo completo aprovado. A cópia manual de contingência foi validada; integração física da área de transferência do iPhone continua no roteiro abaixo.
- Ambos os perfis móveis: sete casos de conversão/classificação, entradas inválidas, botão de sinal, ponto/vírgula, Enter, cálculo completo, anúncio acessível, limpeza, invalidação ao editar, cópia manual, instalação e referências.
- Ambos os motores reabriram uma **nova aba offline** e converteram `−0,483 °C` em `−0,500 °H`, com classificação acima da faixa. Nenhuma leitura em localStorage ou sessionStorage; nenhum erro JavaScript durante os fluxos.
- Layout sem rolagem horizontal em 320, 390, 768 e 1280 pixels CSS. Inspeção visual de capturas desktop e mobile.
- **axe-core 4.14.0**: zero violações automáticas nas regras WCAG 2 A/AA, WCAG 2.1 AA e boas práticas, em dez cenários (390 e 1280 px; vazio, inválido, dentro, acima e abaixo da faixa, com instalação e referências abertas). Isso não substitui testes com leitores de tela reais.
- Atualização real de service worker em servidor local de ensaio: uma segunda versão exibiu o aviso, preservou a leitura até clicar em Atualizar, recarregou duas abas abertas e removeu apenas o cache anterior do aplicativo. As fontes publicadas não foram alteradas para esse ensaio.

## Publicação verificada

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

## Aparelhos reais — pendente

Emulação de navegador não confirma instalação e funcionamento em aparelhos físicos.

- [ ] Android: abrir o link no Chrome, instalar e abrir pelo ícone.
- [ ] Android: digitar `-0,524`, conferir `−0,543 °H` e copiar o resultado.
- [ ] Android: aguardar “Pronto para usar offline”, fechar, ativar modo avião e reabrir pelo ícone; converter novamente.
- [ ] iPhone: abrir no Safari, adicionar à Tela de Início e abrir pelo ícone.
- [ ] iPhone: inserir o sinal pelo botão `−`, digitar com teclado decimal e copiar o resultado.
- [ ] iPhone: aguardar “Pronto para usar offline”, fechar, ativar modo avião e reabrir pelo ícone; converter novamente.
- [ ] Conferir o uso com TalkBack e VoiceOver, tamanho de texto ampliado e contraste sob iluminação de campo.

Nenhuma validação física foi presumida ou marcada como concluída.
