import { describe, expect, it } from "vitest"
import { renderReportCsv } from "../../../src/modules/reporting/application/report-renderer.js"

const document = {
  title: "Relatório gerencial",
  period: "2026-09-01 a 2026-09-06 (America/Recife)",
  rows: [["Receita", "12000"]] as Array<[string, string]>,
}

describe("report renderer", () => {
  it("emits a UTF-8 CSV with headings and spreadsheet formula protection", () => {
    const csv = new TextDecoder().decode(
      renderReportCsv({ ...document, rows: [["=IMPORTXML()", "+1"]] }),
    )
    expect(csv).toContain('"Indicador","Valor"')
    expect(csv).toContain('"\'=IMPORTXML()","\'+1"')
  })
})
