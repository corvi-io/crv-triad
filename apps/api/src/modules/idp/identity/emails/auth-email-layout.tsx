import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import type { ReactNode } from "react"

type AuthEmailLayoutProps = {
  actionLabel: string
  actionUrl: string
  children: ReactNode
  preview: string
  title: string
}

export function AuthEmailLayout({
  actionLabel,
  actionUrl,
  children,
  preview,
  title,
}: AuthEmailLayoutProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>TRIAD</Text>
          <Heading as="h1" style={styles.heading}>
            {title}
          </Heading>
          <Section>{children}</Section>
          <Section style={styles.actionSection}>
            <Button href={actionUrl} style={styles.button}>
              {actionLabel}
            </Button>
          </Section>
          <Text style={styles.fallbackLabel}>Se o botão não funcionar, use este endereço:</Text>
          <Link href={actionUrl} style={styles.fallbackLink}>
            {actionUrl}
          </Link>
          <Hr style={styles.rule} />
          <Text style={styles.footer}>
            Esta é uma mensagem de segurança do TRIAD. Não compartilhe este link.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const authEmailTextStyle = {
  color: "#334155",
  fontFamily: "Arial, sans-serif",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
}

const styles = {
  actionSection: { margin: "28px 0" },
  body: {
    backgroundColor: "#f1f5f9",
    fontFamily: "Arial, sans-serif",
    margin: "0",
    padding: "32px 12px",
  },
  brand: {
    color: "#b08d2f",
    fontSize: "14px",
    fontWeight: "700",
    letterSpacing: "2px",
    margin: "0 0 24px",
  },
  button: {
    backgroundColor: "#0f2747",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "700",
    padding: "13px 22px",
    textDecoration: "none",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #dbe2ea",
    borderRadius: "10px",
    margin: "0 auto",
    maxWidth: "560px",
    padding: "36px",
  },
  fallbackLabel: {
    color: "#475569",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0 0 6px",
  },
  fallbackLink: {
    color: "#0f4c81",
    fontSize: "13px",
    lineHeight: "20px",
    overflowWrap: "anywhere" as const,
  },
  footer: {
    color: "#64748b",
    fontSize: "12px",
    lineHeight: "18px",
    margin: "0",
  },
  heading: {
    color: "#0f2747",
    fontFamily: "Arial, sans-serif",
    fontSize: "26px",
    lineHeight: "34px",
    margin: "0 0 22px",
  },
  rule: { borderColor: "#e2e8f0", margin: "30px 0 20px" },
}
