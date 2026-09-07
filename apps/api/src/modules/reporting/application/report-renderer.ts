import { createHash } from "node:crypto"

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

function pdfEscape(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
}

export function renderReportPdf(document: ReportDocument): Uint8Array {
  const text = [
    document.title,
    document.period,
    ...document.rows.map(([label, value]) => `${label}: ${value}`),
  ]
  const commands = text
    .map(
      (line, index) =>
        `BT /F1 ${index === 0 ? 18 : 11} Tf 54 ${770 - index * 24} Td (${pdfEscape(line)}) Tj ET`,
    )
    .join("\n")
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R /Lang (pt-BR) /MarkInfo << /Marked true >> /Metadata 7 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R /StructParents 0 >>",
    `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /StructTreeRoot /K [] >>",
    `<< /Type /Metadata /Subtype /XML /Length 0 >>\nstream\n\nendstream`,
  ]
  let body = "%PDF-1.7\n"
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xref = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
    .join(
      "\n",
    )}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R /ID [<${createHash("md5").update(commands).digest("hex")}><${createHash("md5").update(commands).digest("hex")}>] >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(body)
}

export type { ReportDocument }
