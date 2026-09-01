import { describe, expect, it } from "vitest"

import { renderAuthEmail } from "../../../src/modules/idp/identity/emails/render.js"
import {
  ActionRequiredEmailExample,
  actionRequiredExampleSubject,
  ChangelogEmailExample,
  changelogExampleSubject,
  OperationsEmailExample,
  operationsExampleSubject,
} from "../../fixtures/future-email-examples.js"

const actionUrl = "https://studio.example.test/example"
const trustedOrigins = ["https://studio.example.test"]

describe("future email category examples", () => {
  it.each([
    [
      actionRequiredExampleSubject,
      <ActionRequiredEmailExample actionUrl={actionUrl} key="action-required" />,
      "Revisar configuração",
    ],
    [
      operationsExampleSubject,
      <OperationsEmailExample actionUrl={actionUrl} key="operations" />,
      "Ver desempenho",
    ],
    [
      changelogExampleSubject,
      <ChangelogEmailExample actionUrl={actionUrl} key="changelog" />,
      "Conhecer as novidades",
    ],
  ])("renders %s as HTML and plain text", async (subject, template, actionLabel) => {
    const message = await renderAuthEmail(template, subject, actionUrl, trustedOrigins)

    expect(message.html).toContain("Sistema operacional para barbearias")
    expect(message.text).toContain(actionLabel)
    expect(message.html).not.toContain("<script")
    expect(message.html).not.toContain("database")
    expect(message.html).not.toContain("primary key")
  })
})
