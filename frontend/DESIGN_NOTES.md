# Design notes

Registro do que foi tentado e por quê, tela por tela, para manter consistência
entre os passes de reconstrução. Não é um changelog — é o raciocínio por trás
das decisões visuais, para a próxima tela (ou a próxima sessão) não reinventar
ou contradizer o que já foi decidido.

## Design system (base)

- **Escuro como único tema, sem toggle.** O app não tinha nenhum mecanismo de
  troca de tema já implementado (`.dark` existia no CSS mas nunca era
  aplicado — dead code). Decisão: em vez de construir um seletor de tema
  (feature não pedida), o palette escuro vira o `:root` direto. Mais simples,
  sem risco de FOUC, sem JS extra.
- **Um único acento de marca (`--primary`, ciano-turquesa `#3dd6c4`), verde e
  vermelho reservados 100% para semântica** (`--success`/`--destructive`).
  Isso evita o erro comum de "botão verde = ação principal" competir
  visualmente com "verde = deu certo/gol marcado".
- **`--text-display` (72px) existe só para o placar.** Nenhum outro texto do
  app usa esse token — é isso que faz o placar "saltar aos olhos" sem
  precisar de nenhum truque adicional (borda, sombra, animação).

## Partida ao Vivo (prioridade máxima)

- **`ScoreClock` como componente dedicado**, não reaproveita `Card` genérico.
  Layout: nome do time + bolinha de cor num header pequeno, placar gigante
  abaixo, cronômetro centralizado por baixo dos dois. O "x" entre os placares
  fica centralizado verticalmente contra a **altura toda da coluna**
  (`items-center` no container), não contra a primeira linha — testado com
  screenshot real, a primeira tentativa (`items-start` + `mt-3` arbitrário)
  deixava o "x" alinhado com o nome do time em vez do placar, o que lia mal.
- **5 estados de cronômetro, cada um com cor e rótulo diferentes** (não
  só o texto do botão muda): `not_started` (cinza, "Não iniciado" — rodada
  nova que ainda não foi iniciada pelo organizador), `running` (branco +
  pontinho pulsante), `paused` (âmbar, "Pausado"), `stoppage` (âmbar,
  "Acréscimos"), `finished`. Antes só existia running/paused implícito no
  texto do botão — agora é impossível confundir "pausado" com "rodando" só
  de bater o olho.
- **Hierarquia física, não só visual, entre ações**: "+1 gol" (ação mais
  frequente) é o botão sólido cor de marca, cheio, no meio da tela.
  "Encerrar jogo" é `outline` (mais quieto) logo abaixo. "Encerrar pelada"
  (ação rara e de maior impacto) foi tirada do header e virou um link de
  texto pequeno no rodapé da tela — fisicamente longe dos botões de gol para
  não ser tocado por engano num momento de pressa.
- **Desfazer em vez de confirmar**: remover um gol e encerrar a pelada agora
  executam na hora e mostram um toast com ação "Desfazer"/"Reabrir", em vez
  de um `confirm()` ou diálogo bloqueante. Reduz fricção na ação mais comum
  (corrigir um gol errado) sem abrir mão de uma saída fácil se for engano.
- **Trava contra toque duplo**: um único estado `busy` desabilita todos os
  botões que disparam ação assíncrona (pausar/retomar, encerrar, pênaltis,
  empréstimo, transição) enquanto a chamada está em voo. Os botões "+1 gol"
  em si não precisam disso — abrem um seletor local (sem rede), então um
  segundo toque não duplica nada.
- **Pênaltis**: os botões "Marcou"/"Perdeu" precisam ser simetricamente
  fortes (são dois resultados igualmente prováveis, não "ação seiva vs. ação
  arriscada") — por isso "Perdeu" recebeu um override para vermelho sólido
  em vez do estilo `destructive` padrão do design system (que é
  intencionalmente discreto para ações tipo "excluir jogador"). Círculos de
  cobrança aumentados (28px) e coluna do time da vez ganha fundo
  `bg-primary/5` + borda, não só a borda sozinha.

## Verificação

- `tsc -b`, `oxlint`, suite Vitest completa (44 testes) — todos limpos após
  cada mudança.
- Screenshot real via Playwright/Chromium contra uma rota de preview
  temporária (`/__preview`, criada e removida na mesma sessão) renderizando
  `ScoreClock` nos 3 estados + botões + `TeamRosterCard` com o CSS compilado
  de verdade — não foi só suposição sobre as cores/tokens. Foi assim que o
  bug do "x" desalinhado e a assimetria Marcou/Perdeu foram encontrados e
  corrigidos antes de considerar a tela pronta.
- Não foi possível screenshot a tela autenticada de verdade (sem
  credenciais/dados reais do Supabase neste ambiente) — a verificação visual
  cobriu os componentes de apresentação isolados (`ScoreClock`, botões,
  `TeamRosterCard`), não o fluxo completo com dados reais.
