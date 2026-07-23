# TRIAD Studio — Recomendação Final ao Codex para Refinamento Visual da Agenda

## Objetivo

Ajustar a tela de Agenda já implementada para que ela mantenha a estrutura visual atual da interface, mas aplique corretamente as melhorias de cor, hierarquia e acabamento premium definidas no primeiro documento de revisão de cores.

Esta instrução não pede uma nova tela, não altera a estrutura funcional existente e não substitui os componentes já criados.

O trabalho deve ser feito sobre a tela atual, preservando:

- sidebar;
- cabeçalho;
- busca;
- filtros;
- seletor Lista/Quadro;
- colunas por barbeiro;
- coluna de horários;
- cards de agendamento;
- drag and drop;
- status;
- dados mockados;
- scroll interno;
- estrutura geral da agenda.

A alteração deve ser exclusivamente de refinamento visual e aplicação correta dos tokens.

---

# 1. Resultado visual esperado

A tela deve manter a composição da versão atual, mas abandonar a aparência de cards inteiros coloridos.

O produto deve transmitir:

- sofisticação;
- precisão;
- consistência;
- alto contraste controlado;
- identidade navy + gold;
- aparência de software premium;
- menor poluição visual;
- leitura mais fácil em agendas densas.

A identidade visual principal deve continuar sendo:

```text
Navy profundo + superfícies neutras + gold discreto
```

As cores de status devem funcionar apenas como informação operacional.

---

# 2. Não redesenhar a estrutura

Não alterar:

- largura da sidebar;
- ordem dos itens;
- posição do logo;
- posição do título;
- posição do CTA;
- estrutura do container de filtros;
- ordem dos filtros;
- quantidade de colunas;
- largura da coluna de horário;
- altura e posição dos cards;
- distribuição dos dados;
- conteúdo dos cards;
- funcionamento do drag and drop;
- scroll interno;
- comportamento dos filtros;
- nomes dos status.

A UI atual deve ser preservada como base.

---

# 3. Alteração principal dos cards

## 3.1 Remover fundos sólidos por status

Não usar o status como preenchimento dominante do card.

Remover comportamentos equivalentes a:

```css
background: green;
background: red;
background: blue;
background: orange;
```

Também não usar os tokens de status diretamente como fundo integral do card.

Errado:

```css
.appointment-card[data-status="confirmed"] {
  background: var(--schedule-confirmed);
}
```

Correto:

```css
.appointment-card {
  background: var(--card);
  color: var(--card-foreground);
}
```

## 3.2 Estrutura visual do card

Cada card deve ter:

- fundo neutro;
- borda discreta;
- barra lateral de status entre 2px e 3px;
- tintura muito sutil no início do card;
- badge de status;
- sombra mínima;
- hover controlado.

O card deve parecer navy antes de parecer verde, azul, âmbar ou vermelho.

---

# 4. Implementação sugerida dos cards

## 4.1 Base

```css
.appointment-card {
  position: relative;
  overflow: hidden;
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.08),
    0 0 0 1px rgb(255 255 255 / 0.01);
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    box-shadow 150ms ease,
    transform 150ms ease;
}
```

## 4.2 Indicador lateral

```css
.appointment-card::before {
  content: "";
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 3px;
  background: var(--status-border);
}
```

## 4.3 Tintura sutil

```css
.appointment-card {
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--status-surface) 18%, var(--card)) 0%,
      var(--card) 34%
    );
}
```

No dark mode, a tintura precisa continuar baixa.

```css
.dark .appointment-card {
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--status-surface) 14%, var(--card)) 0%,
      var(--card) 36%
    );
}
```

Não ultrapassar visualmente essa intensidade.

---

# 5. Mapeamento semântico dos status

Aplicar variáveis locais por status.

```css
.appointment-card[data-status="scheduled"] {
  --status-surface: var(--schedule-scheduled);
  --status-foreground: var(--schedule-scheduled-foreground);
  --status-border: var(--schedule-scheduled-border);
}

.appointment-card[data-status="confirmed"] {
  --status-surface: var(--schedule-confirmed);
  --status-foreground: var(--schedule-confirmed-foreground);
  --status-border: var(--schedule-confirmed-border);
}

.appointment-card[data-status="arrived"] {
  --status-surface: var(--schedule-arrived);
  --status-foreground: var(--schedule-arrived-foreground);
  --status-border: var(--schedule-arrived-border);
}

.appointment-card[data-status="waiting"] {
  --status-surface: var(--schedule-waiting);
  --status-foreground: var(--schedule-waiting-foreground);
  --status-border: var(--schedule-waiting-border);
}

.appointment-card[data-status="in-progress"] {
  --status-surface: var(--schedule-in-progress);
  --status-foreground: var(--schedule-in-progress-foreground);
  --status-border: var(--schedule-in-progress-border);
}

.appointment-card[data-status="completed"] {
  --status-surface: var(--schedule-completed);
  --status-foreground: var(--schedule-completed-foreground);
  --status-border: var(--schedule-completed-border);
}

.appointment-card[data-status="canceled"] {
  --status-surface: var(--schedule-canceled);
  --status-foreground: var(--schedule-canceled-foreground);
  --status-border: var(--schedule-canceled-border);
}

.appointment-card[data-status="no-show"] {
  --status-surface: var(--schedule-no-show);
  --status-foreground: var(--schedule-no-show-foreground);
  --status-border: var(--schedule-no-show-border);
}
```

---

# 6. Badge de status

O badge deve carregar a maior parte da identificação cromática.

```css
.appointment-status-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 20px;
  padding-inline: 6px;
  background: var(--status-surface);
  color: var(--status-foreground);
  border: 1px solid var(--status-border);
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
}
```

Não usar badge com:

- fundo sólido saturado;
- texto branco em todas as situações;
- glow;
- sombra colorida;
- border width maior que 1px.

---

# 7. Estado hover dos cards

```css
.appointment-card:hover {
  border-color: color-mix(
    in srgb,
    var(--status-border) 46%,
    var(--border)
  );

  box-shadow:
    0 4px 12px rgb(0 0 0 / 0.16),
    0 0 0 1px rgb(255 255 255 / 0.025);

  transform: translateY(-1px);
}
```

O hover não deve intensificar o fundo de status.

---

# 8. Drag and drop

Durante o drag:

```css
.appointment-card[data-dragging="true"] {
  opacity: 0.76;
  transform: rotate(0.4deg) scale(1.01);
  box-shadow:
    0 14px 34px rgb(0 0 0 / 0.34),
    0 0 0 1px var(--status-border);
}
```

Na área de destino:

```css
.schedule-drop-zone[data-over="true"] {
  background: color-mix(
    in srgb,
    var(--primary) 5%,
    transparent
  );
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--primary) 30%, transparent);
}
```

Não usar preenchimento forte na célula de destino.

---

# 9. Dark mode da tela atual

Aplicar os tokens definidos no documento de revisão.

A hierarquia deve ser:

```text
Sidebar: mais escura
Background principal: navy profundo
Grade: um nível acima
Cards: mais claros que a grade
Popover: mais claro que os cards
```

Valores principais:

```css
.dark {
  --background: #0b111d;
  --foreground: #f2f4f7;

  --card: #111927;
  --card-foreground: #f2f4f7;

  --popover: #151e2d;
  --popover-foreground: #f2f4f7;

  --primary: #c39a52;
  --primary-foreground: #12100b;

  --secondary: #182234;
  --secondary-foreground: #e5e9f0;

  --muted: #151e2d;
  --muted-foreground: #98a2b3;

  --accent: #202b3e;
  --accent-foreground: #f2f4f7;

  --border: #263247;
  --input: #334158;
  --ring: #d0ab63;

  --sidebar: #080e18;
  --sidebar-foreground: #f2f4f7;
  --sidebar-border: #202b3e;
}
```

---

# 10. Light mode da mesma tela

A tela deve continuar funcionando em light mode com a mesma estrutura.

Valores principais:

```css
:root {
  --background: #f6f7f9;
  --foreground: #172033;

  --card: #fcfcfd;
  --card-foreground: #172033;

  --popover: #ffffff;
  --popover-foreground: #172033;

  --primary: #8a672f;
  --primary-foreground: #ffffff;

  --secondary: #eef1f5;
  --secondary-foreground: #253149;

  --muted: #f0f2f5;
  --muted-foreground: #667085;

  --accent: #f5efe4;
  --accent-foreground: #44341e;

  --border: #dde2ea;
  --input: #c8d0dc;
  --ring: #a77f3e;

  --sidebar: #fbfbfc;
  --sidebar-foreground: #182235;
  --sidebar-border: #e1e5eb;
}
```

Não usar branco puro em todas as superfícies.

---

# 11. Grade da agenda

## 11.1 Fundo da grade

```css
.schedule-grid {
  background: color-mix(
    in srgb,
    var(--background) 72%,
    var(--card)
  );
  border: 1px solid var(--border);
}
```

## 11.2 Linhas

```css
.schedule-grid-line {
  border-color: color-mix(
    in srgb,
    var(--border) 64%,
    transparent
  );
}
```

As linhas devem ser perceptíveis, mas não competir com os cards.

## 11.3 Coluna de horário

```css
.schedule-time-column {
  background: color-mix(
    in srgb,
    var(--muted) 58%,
    var(--background)
  );
}
```

## 11.4 Cabeçalho dos barbeiros

```css
.schedule-barber-header {
  background: color-mix(
    in srgb,
    var(--card) 86%,
    var(--background)
  );
  border-bottom: 1px solid var(--border);
}
```

---

# 12. Sidebar

Preservar a estrutura atual, mas reduzir o contorno gold.

## Estado ativo

```css
.workspace-nav-item[data-active="true"] {
  background: var(--sidebar-accent);
  color: var(--sidebar-accent-foreground);
  border: 0;
  box-shadow: inset 2px 0 0 var(--sidebar-accent-border);
}
```

O item ativo não deve ter:

- contorno gold completo;
- glow;
- fundo amarelo;
- borda grossa.

Usar gold apenas em:

- ícone;
- texto;
- indicador lateral.

---

# 13. Filtros

## Rest

```css
.filter-trigger {
  background: color-mix(
    in srgb,
    var(--card) 82%,
    var(--background)
  );
  color: var(--muted-foreground);
  border: 1px solid var(--border);
}
```

## Activated

```css
.filter-trigger[data-state="activated"] {
  background: var(--brand-gold-subtle);
  color: var(--brand-gold-default);
  border-color: color-mix(
    in srgb,
    var(--brand-gold-default) 64%,
    var(--border)
  );
}
```

O filtro ativo deve parecer selecionado, não preenchido por gold.

---

# 14. Botão “Novo agendamento”

Manter a posição e estrutura atuais.

Aplicar:

```css
.new-appointment-button {
  background: #b98b3f;
  color: #11100c;
  border: 1px solid #d1a95e;
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.18),
    inset 0 1px 0 rgb(255 255 255 / 0.12);
}

.new-appointment-button:hover {
  background: #c79a4b;
}
```

No light mode:

```css
:root .new-appointment-button {
  background: #8a672f;
  color: #ffffff;
  border-color: #765527;
}
```

Não usar amarelo saturado.

---

# 15. Tipografia e contraste

Manter Geist.

Aplicar:

- título da página: semibold;
- nome do barbeiro: semibold;
- nome do cliente: medium ou semibold;
- serviço: regular;
- horário: medium;
- textos auxiliares: muted foreground;
- badges: medium;
- não usar bold em excesso.

O contraste deve ser construído por hierarquia, não por saturação.

---

# 16. Cards cancelados

Os cards cancelados são um dos principais problemas atuais.

Devem continuar predominantemente navy.

Aplicar:

- fundo neutro;
- barra lateral vinho;
- borda vermelho dessaturado;
- badge vermelho discreto;
- texto principal branco;
- serviço em muted foreground.

Não permitir que o card pareça um bloco vermelho.

---

# 17. Cards finalizados e confirmados

Finalizado e confirmado podem compartilhar uma família verde, mas precisam ser visualmente distintos.

## Confirmado

- barra verde discreta;
- badge `Confirmado`;
- superfície neutra;
- tintura quase imperceptível.

## Finalizado

- verde ainda mais calmo;
- badge `Finalizado`;
- sem fundo verde sólido;
- pode usar ícone de check.

Não usar verde brilhante.

---

# 18. No-show

No-show deve ser predominantemente neutro.

Aplicar:

- barra cinza;
- borda cinza;
- badge neutro;
- sem vermelho;
- sem fundo preto absoluto.

No-show não é a mesma coisa que cancelado.

---

# 19. Em atendimento

Usar azul dessaturado apenas em:

- barra lateral;
- badge;
- borda;
- ícone.

O card deve continuar navy.

Não preencher o card com azul petróleo.

---

# 20. Em espera

Usar amber queimado e não laranja forte.

Aplicar:

- barra lateral âmbar;
- badge âmbar;
- borda suave;
- tintura quente mínima.

---

# 21. Critérios de aceitação visual

A revisão estará correta quando:

- [ ] todos os cards parecerem pertencentes ao mesmo produto;
- [ ] nenhum card parecer um bloco sólido verde, vermelho, azul ou laranja;
- [ ] o status estiver claro por badge e indicador lateral;
- [ ] o navy continuar sendo a superfície predominante;
- [ ] o gold estiver reservado para marca e seleção;
- [ ] a sidebar estiver mais escura que o conteúdo;
- [ ] os filtros inativos estiverem neutros;
- [ ] os filtros ativos estiverem discretamente gold;
- [ ] as linhas da grade estiverem mais suaves;
- [ ] cards cancelados não dominarem a tela;
- [ ] cards finalizados não pareçam neon;
- [ ] no-show estiver neutro;
- [ ] dark e light mode usarem os mesmos tokens semânticos;
- [ ] nenhuma cor de status estiver hardcoded no componente;
- [ ] os dados e funcionalidades existentes permanecerem intactos.

---

# 22. Instrução final ao Codex

Aplique esta revisão sobre a UI atual.

Não redesenhe a tela.

Não gere uma nova página.

Não altere os dados.

Não altere a estrutura.

Não altere o drag and drop.

Não altere os filtros.

Não remova light ou dark mode.

Apenas refine a camada visual para que a implementação existente siga corretamente o sistema de cores premium do TRIAD Studio.

A prioridade máxima é:

```text
Todos os cards devem permanecer visualmente neutros.
As cores de status devem ser sinais, não superfícies dominantes.
```
