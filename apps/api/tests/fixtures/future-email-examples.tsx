import { Column, Heading, Hr, Row, Section, Text } from "@react-email/components"

import {
  AuthEmailLayout,
  authEmailTextStyle,
} from "../../src/modules/idp/identity/emails/auth-email-layout.js"

export const actionRequiredExampleSubject = "[Exemplo] Uma configuração precisa da sua atenção"
export const operationsExampleSubject = "[Exemplo] O ritmo da Barbearia Aurora nesta semana"
export const changelogExampleSubject = "[Exemplo] Novidades TRIAD — Setembro de 2026"

export function ActionRequiredEmailExample({ actionUrl }: { actionUrl: string }) {
  return (
    <AuthEmailLayout
      actionLabel="Revisar configuração"
      actionUrl={actionUrl}
      footerNote="Você recebeu esta mensagem porque administra a Barbearia Aurora no TRIAD."
      preview="Uma configuração da Barbearia Aurora precisa ser revisada."
      title="Uma configuração precisa da sua atenção."
    >
      <Text style={authEmailTextStyle}>
        A agenda online da <strong>Barbearia Aurora</strong> não está recebendo novos agendamentos.
      </Text>
      <Section style={styles.notice}>
        <Text style={styles.noticeTitle}>O que fazer</Text>
        <Text style={styles.noticeText}>
          Revise a configuração até 5 de setembro para voltar a receber agendamentos pela internet.
        </Text>
      </Section>
      <Text style={authEmailTextStyle}>
        A agenda interna continua disponível para você e sua equipe.
      </Text>
    </AuthEmailLayout>
  )
}

export function OperationsEmailExample({ actionUrl }: { actionUrl: string }) {
  return (
    <AuthEmailLayout
      actionLabel="Ver desempenho"
      actionUrl={actionUrl}
      footerNote="Você recebeu este resumo porque acompanha a gestão da Barbearia Aurora no TRIAD."
      preview="Atendimentos, ocupação e oportunidades da Barbearia Aurora nesta semana."
      title="Uma semana de bom ritmo na Aurora."
    >
      <Text style={authEmailTextStyle}>
        Entre 24 e 30 de agosto, a equipe realizou <strong>86 atendimentos</strong>. Veja os sinais
        que merecem sua atenção.
      </Text>
      <Section style={styles.metrics}>
        <Row>
          <Column style={styles.metricColumn}>
            <Text style={styles.metricValue}>78%</Text>
            <Text style={styles.metricLabel}>ocupação da agenda</Text>
          </Column>
          <Column style={styles.metricColumnLast}>
            <Text style={styles.metricValue}>12</Text>
            <Text style={styles.metricLabel}>clientes que retornaram</Text>
          </Column>
        </Row>
      </Section>
      <Heading as="h2" style={styles.sectionHeading}>
        Um espaço para crescer
      </Heading>
      <Text style={authEmailTextStyle}>
        Quinta-feira à tarde concentrou os horários livres da semana. Pode ser um bom momento para
        estimular novos agendamentos.
      </Text>
    </AuthEmailLayout>
  )
}

export function ChangelogEmailExample({ actionUrl }: { actionUrl: string }) {
  return (
    <AuthEmailLayout
      actionLabel="Conhecer as novidades"
      actionUrl={actionUrl}
      footerNote="Este é um exemplo de comunicação sobre novidades da TRIAD. Preferências e descadastro serão incluídos antes do envio real desta categoria."
      preview="Uma agenda mais clara e novas formas de acompanhar a operação."
      title="Mais clareza para os dias que mudam rápido."
    >
      <Text style={authEmailTextStyle}>
        A TRIAD evoluiu em pontos que fazem diferença quando a barbearia está em movimento. Nesta
        edição, reunimos três novidades para você conhecer.
      </Text>

      <Hr style={styles.contentRule} />
      <Heading as="h2" style={styles.featureHeading}>
        A agenda agora mostra o momento atual
      </Heading>
      <Text style={authEmailTextStyle}>
        Uma referência discreta acompanha o horário do dia e ajuda a equipe a reconhecer atrasos,
        encaixes e próximos atendimentos com mais rapidez.
      </Text>

      <Hr style={styles.contentRule} />
      <Heading as="h2" style={styles.featureHeading}>
        Semana inteira, sem perder o contexto
      </Heading>
      <Text style={authEmailTextStyle}>
        A nova visão semanal aproxima disponibilidade, profissionais e compromissos para facilitar
        decisões antes que o movimento comece.
      </Text>

      <Hr style={styles.contentRule} />
      <Heading as="h2" style={styles.featureHeading}>
        Resultados mais fáceis de acompanhar
      </Heading>
      <Text style={authEmailTextStyle}>
        Os relatórios destacam os sinais mais importantes da operação para transformar movimento em
        decisão.
      </Text>
    </AuthEmailLayout>
  )
}

const styles = {
  contentRule: { borderColor: "#ddd6c8", margin: "28px 0" },
  featureHeading: {
    color: "#17233a",
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: "22px",
    fontWeight: "400",
    lineHeight: "30px",
    margin: "0 0 12px",
  },
  metricColumn: {
    borderRight: "1px solid #d8d1c3",
    padding: "4px 24px 4px 0",
    width: "50%",
  },
  metricColumnLast: { padding: "4px 0 4px 24px", width: "50%" },
  metricLabel: {
    color: "#69758a",
    fontSize: "12px",
    lineHeight: "18px",
    margin: "3px 0 0",
  },
  metrics: {
    backgroundColor: "#f3efe5",
    borderRadius: "4px",
    margin: "28px 0 30px",
    padding: "22px 24px",
  },
  metricValue: {
    color: "#17233a",
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: "28px",
    lineHeight: "34px",
    margin: "0",
  },
  notice: {
    backgroundColor: "#f3efe5",
    borderTop: "2px solid #a77d38",
    margin: "26px 0 28px",
    padding: "22px 24px 20px",
  },
  noticeText: {
    color: "#334058",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0",
  },
  noticeTitle: {
    color: "#17233a",
    fontSize: "13px",
    fontWeight: "700",
    lineHeight: "20px",
    margin: "0 0 6px",
  },
  sectionHeading: {
    color: "#17233a",
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: "22px",
    fontWeight: "400",
    lineHeight: "30px",
    margin: "0 0 12px",
  },
}
