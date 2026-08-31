# TRIAD Studio — Prompt para Implementação da Página de Dashboard

## Objetivo

Implemente uma nova página de **Dashboard** para o TRIAD Studio.

Trate esta entrega como uma página separada dentro do projeto atual.

Use obrigatoriamente:

- o Design System já disponível no projeto;
- os componentes existentes;
- os tokens de cor já implementados;
- os dados já presentes no projeto;
- as estruturas, tipos e mocks já existentes;
- a navegação e o shell autenticado já implementados.

Não crie um novo Design System.

Não substitua componentes existentes por componentes paralelos.

Não invente uma nova identidade visual.

Não altere a página de Agenda.

Não altere regras de negócio já implementadas.

Não crie dados duplicados quando já existirem fontes disponíveis no projeto.

A página deve apenas organizar e apresentar os dados existentes em uma visão operacional e gerencial.

---

# 1. Contexto da página

O Dashboard do TRIAD Studio deve funcionar como a principal visão de leitura da operação da barbearia.

A página precisa responder rapidamente:

- como está a operação do dia;
- quantos atendimentos estão previstos;
- quantos já foram concluídos;
- quanto já foi faturado;
- como está a ocupação da equipe;
- quais problemas precisam de atenção;
- quais atendimentos acontecerão em seguida;
- onde existe capacidade disponível;
- onde há perda por cancelamento ou no-show.

A Agenda continua sendo a tela de execução operacional.

O Dashboard deve ser a tela de acompanhamento, leitura e decisão.

---

# 2. Escopo

Criar apenas a página:

```text
TRIAD Studio
└── Dashboard
```

A página deve ser acessada pelo item `Dashboard` da navegação já existente.

Não criar páginas adicionais.

Não criar drawers, modais ou fluxos extras além dos já existentes no projeto.

Quando um bloco precisar direcionar o usuário para mais detalhes, reutilize as rotas existentes.

---

# 3. Estrutura geral da página

A página deve conter:

1. Cabeçalho;
2. Filtros globais;
3. Indicadores principais;
4. Próximos atendimentos;
5. Atenção necessária;
6. Fluxo dos atendimentos;
7. Ocupação dos barbeiros;
8. Capacidade do dia;
9. Financeiro operacional;
10. Serviços do período;
11. Cancelamentos e no-show;
12. Clientes do período.

A tela deve ser responsiva para desktop, priorizando uma largura mínima de 1440px.

Em larguras menores, reorganize os blocos sem perder hierarquia.

---

# 4. Cabeçalho

## Título

```text
Dashboard
```

## Subtítulo

```text
Acompanhe a operação, os atendimentos e o desempenho da unidade.
```

## CTA principal

```text
+ Novo agendamento
```

O CTA deve reutilizar o fluxo de criação de agendamento já disponível no projeto.

Não criar uma nova implementação para esse fluxo.

---

# 5. Filtros globais

Adicionar uma barra de filtros no topo da página.

## Filtros

### Período

Opções:

- Hoje;
- Ontem;
- Esta semana;
- Este mês;
- Personalizado.

Estado inicial:

```text
Hoje
```

### Unidade

Usar as unidades já existentes no projeto.

Caso os dados atuais contenham apenas as unidades já trabalhadas, considerar:

- Centro;
- Artesão.

### Barbeiro

Opções:

- Todos os barbeiros;
- profissionais já cadastrados no projeto.

## Atualização

Exibir uma informação discreta de atualização:

```text
Atualizado agora
```

ou:

```text
Atualizado às 08:32
```

Use o dado real disponível no estado atual da aplicação.

---

# 6. Indicadores principais

Criar uma primeira linha com cinco cards de KPI.

## 6.1 Agendamentos

Exibir:

- total de agendamentos do período;
- comparação com o período anterior, quando esse dado existir.

Exemplo visual:

```text
Agendamentos
42 agendamentos
+8% comparado ao período anterior
```

## 6.2 Concluídos

Exibir:

- total de atendimentos concluídos;
- percentual sobre a agenda do período.

Exemplo:

```text
Concluídos
18 concluídos
43% da agenda do dia
```

## 6.3 Faturamento

Exibir:

- faturamento realizado;
- texto auxiliar.

Exemplo:

```text
Faturamento
R$ 1.840
Recebido até agora
```

## 6.4 Ticket médio

Exibir:

- ticket médio;
- comparação com a média anterior, se houver.

Exemplo:

```text
Ticket médio
R$ 72,40
+R$ 6,20 em relação à média
```

## 6.5 Ocupação

Exibir:

- percentual de ocupação;
- quantidade de horários preenchidos sobre a capacidade disponível.

Exemplo:

```text
Ocupação
74%
31 de 42 horários preenchidos
```

---

# 7. Próximos atendimentos

Criar um card grande com o título:

```text
Próximos atendimentos
```

Exibir entre cinco e seis registros.

## Colunas sugeridas

- Horário;
- Cliente;
- Serviço;
- Barbeiro;
- Status;
- Tempo restante;
- Ações.

## Informações por linha

- horário;
- avatar do cliente;
- nome do cliente;
- serviço;
- avatar do barbeiro;
- nome do barbeiro;
- badge de status;
- tempo restante;
- menu de ações.

## Ações

Reutilizar ações já existentes no projeto, quando disponíveis:

- abrir agendamento;
- fazer check-in;
- iniciar atendimento;
- registrar chegada;
- entrar em contato;
- reagendar.

Adicionar CTA secundário:

```text
Ver agenda
```

Esse CTA deve navegar para a página de Agenda.

---

# 8. Atenção necessária

Criar um card ao lado de Próximos atendimentos.

Título:

```text
Atenção necessária
```

Exibir somente itens acionáveis.

## Possíveis tipos

- cliente aguardando além do limite;
- pagamento pendente;
- conflito de horário;
- atendimento aberto há muito tempo;
- cancelamento recente;
- agendamento sem barbeiro;
- barbeiro indisponível;
- horário próximo ainda não confirmado.

## Estrutura de cada alerta

- ícone;
- título;
- descrição curta;
- ação de navegação.

Exemplos:

```text
Felipe Andrade está aguardando há 18 min
Agendado para 09:50 com Bruno Rocha
```

```text
Pagamento de João Pedro ainda está pendente
Valor: R$ 65,00
```

```text
Há conflito de horário às 11:30
2 atendimentos no mesmo horário
```

Adicionar CTA:

```text
Ver todos
```

---

# 9. Fluxo dos atendimentos

Criar um bloco com o título:

```text
Fluxo dos atendimentos
```

Exibir os principais status operacionais.

## Status

- Confirmados;
- Check-in;
- Em espera;
- Em atendimento;
- Finalizados;
- Cancelados;
- No-show.

Cada status deve conter:

- ícone;
- label;
- quantidade;
- cor semântica conforme o Design System atual.

Os cards devem ser clicáveis.

Ao clicar, navegar para a Agenda já filtrada pelo status correspondente, reutilizando o comportamento existente.

---

# 10. Ocupação dos barbeiros

Criar um card com o título:

```text
Ocupação dos barbeiros
```

Exibir uma tabela compacta ou lista estruturada.

## Colunas sugeridas

- Barbeiro;
- Atendimentos;
- % ocupado;
- Faturamento;
- Estado atual.

## Informações por barbeiro

- avatar;
- nome;
- total de atendimentos;
- barra de ocupação;
- percentual;
- faturamento realizado;
- status atual.

## Estados possíveis

- Em atendimento;
- Próximo atendimento;
- Disponível;
- Disponível em X min;
- Em intervalo;
- Fora do expediente.

Não criar ranking competitivo.

A informação deve apoiar a gestão operacional.

---

# 11. Capacidade do dia

Criar um card com o título:

```text
Capacidade do dia
```

Exibir a ocupação por faixa do dia.

## Faixas

- Manhã;
- Tarde;
- Noite.

## Informações

Para cada faixa:

- label;
- horário;
- barra de progresso;
- percentual de ocupação.

Exemplo:

```text
Manhã (08h–12h) 92%
Tarde (12h–18h) 68%
Noite (18h–22h) 54%
```

Adicionar um resumo inferior:

- capacidade disponível;
- tempo reservado;
- tempo livre.

Exemplo:

```text
Capacidade disponível: 63h
Tempo reservado: 46h
Tempo livre: 17h
```

---

# 12. Financeiro operacional

Criar um card com o título:

```text
Financeiro operacional
```

## Indicadores principais

- Realizado;
- Previsto;
- Pendente;
- Descontos.

## Exemplo

```text
Realizado: R$ 1.840
Previsto: R$ 3.220
Pendente: R$ 185
Descontos: R$ 70
```

## Formas de pagamento

Mostrar distribuição por:

- Pix;
- Débito;
- Crédito;
- Dinheiro;
- Pagamento misto, se existir.

Para cada forma:

- valor;
- percentual;
- barra proporcional.

Não criar gráfico de pizza.

Use uma lista visual compacta.

---

# 13. Serviços do período

Criar um card com o título:

```text
Serviços do período
```

Exibir os principais serviços do período.

## Colunas

- Serviço;
- Quantidade;
- Receita.

Limitar aos cinco principais.

Exemplo:

```text
Cabelo & Barba      12      R$ 720
Corte degradê        9      R$ 540
Corte simples        7      R$ 280
Barba na navalha     6      R$ 180
```

Adicionar CTA:

```text
Ver todos os serviços
```

Esse CTA deve reutilizar a rota já existente de Serviços.

---

# 14. Cancelamentos e no-show

Criar um card com o título:

```text
Cancelamentos e no-show
```

Exibir:

- total de cancelamentos;
- total de no-show;
- taxa de perda;
- receita potencial perdida.

Exemplo:

```text
2 cancelamentos
1 no-show
6,8% de taxa de perda
R$ 145 em receita perdida
```

Use as cores semânticas de forma discreta.

Não preencher todo o card com vermelho.

---

# 15. Clientes do período

Criar um card com o título:

```text
Clientes do período
```

Exibir:

- clientes atendidos;
- clientes novos;
- clientes recorrentes;
- percentual de recorrência.

Exemplo:

```text
24 clientes atendidos
7 novos
17 recorrentes
71% de recorrência
```

---

# 16. Hierarquia visual sugerida

## Primeira dobra

```text
Cabeçalho
Filtros
KPIs
Próximos atendimentos | Atenção necessária
```

## Segunda dobra

```text
Fluxo dos atendimentos
Ocupação dos barbeiros
```

## Terceira dobra

```text
Capacidade do dia
Financeiro operacional
Serviços do período
```

## Quarta dobra

```text
Cancelamentos e no-show
Clientes do período
```

---

# 17. Diretrizes visuais

Use apenas o Design System existente.

Não hardcodar novas cores se já houver tokens semânticos disponíveis.

Use:

- background;
- card;
- muted;
- border;
- primary;
- feedback;
- schedule status;
- sidebar;
- foreground;
- muted foreground.

Priorizar:

- superfícies neutras;
- bordas discretas;
- gold apenas em CTA e seleção;
- status como badges e indicadores;
- tipografia Geist, caso já esteja configurada;
- espaçamento consistente;
- densidade compatível com o restante do produto.

Não criar:

- gradientes decorativos;
- sombras exageradas;
- cards coloridos inteiros;
- ícones neon;
- charts desnecessários;
- animações chamativas.

---

# 18. Responsividade

## Desktop grande

- cinco KPIs em linha;
- Próximos atendimentos e Atenção necessária lado a lado;
- três cards na terceira dobra.

## Desktop médio

- KPIs em duas linhas;
- blocos em duas colunas;
- tabelas com scroll interno quando necessário.

## Tablet

- uma coluna;
- manter hierarquia;
- preservar legibilidade.

Não é necessário criar uma experiência mobile completa nesta entrega.

---

# 19. Dados

Use exclusivamente:

- dados já existentes no projeto;
- mocks já implementados;
- entidades atuais;
- tipos atuais;
- funções atuais;
- rotas atuais.

Não criar uma segunda camada de dados paralela.

Caso algum indicador não possa ser calculado com os dados atuais:

- use o dado mais próximo disponível;
- preserve a estrutura visual;
- marque o cálculo como derivado;
- não invente uma nova API.

---

# 20. Interações

Os blocos devem ser navegáveis quando fizer sentido.

## Navegações sugeridas

- Agendamentos → Agenda;
- Concluídos → Agenda filtrada;
- Status → Agenda filtrada;
- Barbeiro → Agenda filtrada pelo profissional;
- Pagamentos pendentes → fluxo financeiro existente;
- Serviço → Serviços;
- Cliente → perfil do cliente, se já existir;
- Novo agendamento → fluxo atual.

Não criar rotas novas sem necessidade.

---

# 21. Estados da página

Implementar:

- loading;
- vazio;
- erro;
- sem resultados por filtro.

## Loading

Usar skeletons do Design System.

## Vazio

Exemplo:

```text
Ainda não há dados para este período.
```

## Erro

Exemplo:

```text
Não foi possível carregar o dashboard.
Tente novamente.
```

---

# 22. Critérios de aceitação

A página estará concluída quando:

- [ ] existir como rota separada;
- [ ] o item Dashboard estiver ativo ao acessar a página;
- [ ] o Design System atual for reutilizado;
- [ ] os dados atuais do projeto forem reutilizados;
- [ ] não houver duplicação desnecessária de mocks;
- [ ] os filtros funcionarem;
- [ ] os KPIs refletirem o período selecionado;
- [ ] os próximos atendimentos forem exibidos;
- [ ] os alertas forem acionáveis;
- [ ] o fluxo dos atendimentos for clicável;
- [ ] a ocupação dos barbeiros for exibida;
- [ ] a capacidade do dia for exibida;
- [ ] o financeiro operacional for exibido;
- [ ] os serviços do período forem exibidos;
- [ ] cancelamentos e no-show forem exibidos;
- [ ] clientes do período forem exibidos;
- [ ] a página estiver visualmente alinhada ao restante do TRIAD Studio;
- [ ] a Agenda existente permanecer intacta.

---

# 23. Instrução final ao Codex

Implemente somente a nova página de Dashboard.

Use a base já existente do projeto.

Reaproveite o Design System, os componentes, os dados, os tipos e as rotas existentes.

Não redesenhe outras páginas.

Não altere a Agenda.

Não crie uma nova identidade visual.

Não duplique dados.

Não adicione funcionalidades fora deste escopo.

A prioridade é entregar uma visão operacional clara, útil e consistente com o TRIAD Studio atual.
