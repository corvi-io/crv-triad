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
  footerNote?: string
  preview: string
  title: string
}

export function AuthEmailLayout({
  actionLabel,
  actionUrl,
  children,
  footerNote = "Esta mensagem foi enviada pela TRIAD. Não compartilhe links de acesso recebidos por e-mail.",
  preview,
  title,
}: AuthEmailLayoutProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.frame}>
          <Section style={styles.masthead}>
            <Text style={styles.brand}>TRIAD</Text>
            <Text style={styles.brandDescriptor}>Sistema operacional para barbearias</Text>
          </Section>

          <Section style={styles.content}>
            <Heading as="h1" style={styles.heading}>
              {title}
            </Heading>
            <Section>{children}</Section>
            <Section style={styles.actionSection}>
              <Button href={actionUrl} style={styles.button}>
                {actionLabel}
              </Button>
            </Section>
            <Text style={styles.fallbackLabel}>Se preferir, copie e cole este endereço:</Text>
            <Link href={actionUrl} style={styles.fallbackLink}>
              {actionUrl}
            </Link>
          </Section>

          <Section style={styles.footer}>
            <Hr style={styles.rule} />
            <Text style={styles.footerBrand}>TRIAD</Text>
            <Text style={styles.footerNote}>{footerNote}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const authEmailTextStyle = {
  color: "#334058",
  fontFamily: 'Arial, "Helvetica Neue", sans-serif',
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 18px",
}

const styles = {
  actionSection: { margin: "34px 0 30px" },
  body: {
    backgroundColor: "#f2efe8",
    fontFamily: 'Arial, "Helvetica Neue", sans-serif',
    margin: "0",
    padding: "40px 12px",
  },
  brand: {
    color: "#d8b86c",
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: "24px",
    fontWeight: "700",
    letterSpacing: "5px",
    lineHeight: "30px",
    margin: "0 0 8px",
  },
  brandDescriptor: {
    color: "#aeb8ca",
    fontSize: "11px",
    letterSpacing: "1.4px",
    lineHeight: "18px",
    margin: "0",
    textTransform: "uppercase" as const,
  },
  button: {
    backgroundColor: "#86652f",
    borderRadius: "4px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: "700",
    letterSpacing: "0.2px",
    padding: "14px 24px",
    textDecoration: "none",
  },
  content: {
    backgroundColor: "#fffdf8",
    padding: "44px 46px 42px",
  },
  fallbackLabel: {
    color: "#69758a",
    fontSize: "12px",
    lineHeight: "19px",
    margin: "0 0 6px",
  },
  fallbackLink: {
    color: "#4e607d",
    fontSize: "12px",
    lineHeight: "19px",
    overflowWrap: "anywhere" as const,
    textDecoration: "underline",
  },
  footer: {
    backgroundColor: "#f8f5ee",
    padding: "0 46px 30px",
  },
  footerBrand: {
    color: "#8a6932",
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "2.5px",
    lineHeight: "18px",
    margin: "0 0 8px",
  },
  footerNote: {
    color: "#5f6b7f",
    fontSize: "11px",
    lineHeight: "18px",
    margin: "0",
  },
  frame: {
    backgroundColor: "#fffdf8",
    borderRadius: "4px",
    boxShadow: "0 18px 48px rgba(8, 13, 25, 0.12)",
    margin: "0 auto",
    maxWidth: "600px",
    overflow: "hidden",
  },
  heading: {
    color: "#111c31",
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: "34px",
    fontWeight: "400",
    letterSpacing: "-0.5px",
    lineHeight: "42px",
    margin: "0 0 26px",
  },
  masthead: {
    backgroundColor: "#0b1426",
    borderBottom: "3px solid #a77d38",
    padding: "32px 46px 28px",
  },
  rule: { borderColor: "#ddd6c8", margin: "0 0 26px" },
}
