type ReportDocument = {
  title: string
  period: string
  rows: Array<[string, string]>
}

function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}

export function renderReportCsv(document: ReportDocument): Uint8Array {
  const lines = [
    ["Relatório", document.title],
    ["Período", document.period],
    [],
    ["Indicador", "Valor"],
    ...document.rows,
  ]
  return new TextEncoder().encode(
    `\uFEFF${lines.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`,
  )
}

export type { ReportDocument }
