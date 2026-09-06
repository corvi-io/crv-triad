import { fileURLToPath } from "node:url"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  createReportRequestSchema,
  type ReportType,
} from "../../src/modules/reporting/application/report-catalog.js"
import { createReportingService } from "../../src/modules/reporting/application/reporting-service.js"

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error("TEST_DATABASE_URL is required")
const target = new URL(url)
if (
  !["127.0.0.1", "localhost"].includes(target.hostname) ||
  target.port === "5432" ||
  !target.pathname.endsWith("_test")
)
  throw new Error("Isolated local test database required")

const pool = new Pool({ connectionString: url })
const db = drizzle(pool)
const actor = {
  organizationId: "metrics-org",
  organizationName: "Metrics",
  actorUserId: "metrics-owner",
  membershipId: "metrics-member",
  role: "owner" as const,
}
const reporting = createReportingService(db as never)
const range = { from: "2026-09-01", to: "2026-09-30" }

function config(reportType: ReportType) {
  return createReportRequestSchema.parse({
    format: "csv",
    reportType,
    filters: range,
    timezone: "America/Recife",
    idempotencyKey: crypto.randomUUID(),
  }).configSnapshot
}

function values(rows: Awaited<ReturnType<typeof reporting.report>>) {
  return Object.fromEntries(rows)
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) })
  await pool.query(`
    insert into idp_organizations (id, name, slug) values ('metrics-org', 'Metrics', 'metrics');
    insert into idp_users (id, name, email, email_verified) values
      ('metrics-owner', 'Owner', 'metrics-owner@example.invalid', true),
      ('metrics-pro-user-1', 'Ana', 'ana@example.invalid', true),
      ('metrics-pro-user-2', 'Bia', 'bia@example.invalid', true);
    insert into idp_members (id, organization_id, user_id, role)
      values ('metrics-member', 'metrics-org', 'metrics-owner', 'owner');
    insert into units (id, organization_id, code, normalized_code, name, address, timezone, opening_start, opening_end)
      values
      ('metrics-unit-1', 'metrics-org', 'M1', 'm1', 'Centro', 'Rua 1', 'America/Recife', '08:00', '18:00'),
      ('metrics-unit-2', 'metrics-org', 'M2', 'm2', 'Norte', 'Rua 2', 'America/Recife', '08:00', '18:00');
    insert into services (id, organization_id, name, normalized_name, category, description, duration_minutes, price_cents)
      values
      ('metrics-service-1', 'metrics-org', 'Corte', 'corte', 'Cabelo', 'Corte', 30, 1000),
      ('metrics-service-2', 'metrics-org', 'Barba', 'barba', 'Barba', 'Barba', 20, 2000);
    insert into professionals (id, organization_id, role, global_user_id)
      values
      ('metrics-pro-1', 'metrics-org', 'Barbeira', 'metrics-pro-user-1'),
      ('metrics-pro-2', 'metrics-org', 'Barbeira', 'metrics-pro-user-2');
    insert into clients (id, organization_id, name, normalized_phone)
      values
      ('metrics-client-returning', 'metrics-org', 'Cliente Recorrente', '5581999990001'),
      ('metrics-client-new', 'metrics-org', 'Cliente Novo', '5581999990002');
    insert into service_desk_visits
      (id, organization_id, unit_id, client_id, source, status, customer_display_name, unit_name, timezone, requested_service_id, requested_professional_id, arrived_at)
      values
      ('metrics-visit-old', 'metrics-org', 'metrics-unit-1', 'metrics-client-returning', 'walk-in', 'completed', 'Recorrente', 'Centro', 'America/Recife', 'metrics-service-1', 'metrics-pro-1', '2026-08-20T10:00:00Z'),
      ('metrics-visit-1', 'metrics-org', 'metrics-unit-1', 'metrics-client-returning', 'walk-in', 'completed', 'Recorrente', 'Centro', 'America/Recife', 'metrics-service-1', 'metrics-pro-1', '2026-09-10T10:00:00Z'),
      ('metrics-visit-2', 'metrics-org', 'metrics-unit-2', 'metrics-client-new', 'walk-in', 'completed', 'Novo', 'Norte', 'America/Recife', 'metrics-service-2', 'metrics-pro-2', '2026-09-11T10:00:00Z'),
      ('metrics-visit-reversed', 'metrics-org', 'metrics-unit-1', 'metrics-client-returning', 'walk-in', 'completed', 'Recorrente', 'Centro', 'America/Recife', 'metrics-service-1', 'metrics-pro-1', '2026-09-12T10:00:00Z');
    insert into service_desk_completed_handoffs (id, organization_id, visit_id, payload)
      select 'handoff-' || id, organization_id, id,
        jsonb_build_object('schemaVersion', 1, 'tenantId', organization_id, 'unitId', unit_id, 'unitName', unit_name, 'timezone', timezone, 'visitId', id, 'clientId', client_id, 'appointmentId', null, 'customerDisplayName', customer_display_name, 'finishedAt', arrived_at, 'visitVersion', 1, 'items', '[]'::jsonb)
      from service_desk_visits where organization_id = 'metrics-org';
    insert into revenue_checkouts
      (id, organization_id, unit_id, visit_id, client_id, customer_display_name, unit_name, timezone, handoff_version, finished_at, status)
      select 'checkout-' || id, organization_id, unit_id, id, client_id, customer_display_name, unit_name, timezone, 1, arrived_at, 'registered'
      from service_desk_visits where organization_id = 'metrics-org';
    insert into revenue_cash_days
      (id, organization_id, unit_id, local_date, timezone, opening_cash_cents, opened_by, opened_by_name)
      values
      ('metrics-day-old', 'metrics-org', 'metrics-unit-1', '2026-08-20', 'America/Recife', 0, 'metrics-owner', 'Owner'),
      ('metrics-day-1', 'metrics-org', 'metrics-unit-1', '2026-09-10', 'America/Recife', 0, 'metrics-owner', 'Owner'),
      ('metrics-day-2', 'metrics-org', 'metrics-unit-2', '2026-09-11', 'America/Recife', 0, 'metrics-owner', 'Owner'),
      ('metrics-day-r', 'metrics-org', 'metrics-unit-1', '2026-09-12', 'America/Recife', 0, 'metrics-owner', 'Owner');
    insert into revenue_receipts
      (id, organization_id, checkout_id, cash_day_id, local_date, timezone, status, subtotal_cents, discount_cents, surcharge_cents, total_cents, checkout_version, policy_version, actor_user_id, actor_display_name)
      values
      ('metrics-receipt-old', 'metrics-org', 'checkout-metrics-visit-old', 'metrics-day-old', '2026-08-20', 'America/Recife', 'active', 700, 0, 0, 700, 1, 1, 'metrics-owner', 'Owner'),
      ('metrics-receipt-1', 'metrics-org', 'checkout-metrics-visit-1', 'metrics-day-1', '2026-09-10', 'America/Recife', 'active', 1000, 0, 0, 1000, 1, 1, 'metrics-owner', 'Owner'),
      ('metrics-receipt-2', 'metrics-org', 'checkout-metrics-visit-2', 'metrics-day-2', '2026-09-11', 'America/Recife', 'active', 2000, 0, 0, 2000, 1, 1, 'metrics-owner', 'Owner'),
      ('metrics-receipt-r', 'metrics-org', 'checkout-metrics-visit-reversed', 'metrics-day-r', '2026-09-12', 'America/Recife', 'reversed', 500, 0, 0, 500, 1, 1, 'metrics-owner', 'Owner');
    insert into revenue_receipt_lines
      (id, organization_id, receipt_id, checkout_line_id, sequence, snapshot, gross_cents, net_cents)
      values
      ('metrics-line-old', 'metrics-org', 'metrics-receipt-old', 'cl-old', 1, '{"professionalId":"metrics-pro-1","professionalName":"Ana","serviceId":"metrics-service-1","serviceName":"Corte","itemId":"i-old","handoffPriceCents":700,"startedAt":"2026-08-20T10:00:00Z","finishedAt":"2026-08-20T10:30:00Z"}', 700, 700),
      ('metrics-line-1', 'metrics-org', 'metrics-receipt-1', 'cl-1', 1, '{"professionalId":"metrics-pro-1","professionalName":"Ana","serviceId":"metrics-service-1","serviceName":"Corte","itemId":"i-1","handoffPriceCents":1000,"startedAt":"2026-09-10T10:00:00Z","finishedAt":"2026-09-10T10:30:00Z"}', 1000, 1000),
      ('metrics-line-2', 'metrics-org', 'metrics-receipt-2', 'cl-2', 1, '{"professionalId":"metrics-pro-2","professionalName":"Bia","serviceId":"metrics-service-2","serviceName":"Barba","itemId":"i-2","handoffPriceCents":2000,"startedAt":"2026-09-11T10:00:00Z","finishedAt":"2026-09-11T10:20:00Z"}', 2000, 2000),
      ('metrics-line-r', 'metrics-org', 'metrics-receipt-r', 'cl-r', 1, '{"professionalId":"metrics-pro-1","professionalName":"Ana","serviceId":"metrics-service-1","serviceName":"Corte","itemId":"i-r","handoffPriceCents":500,"startedAt":"2026-09-12T10:00:00Z","finishedAt":"2026-09-12T10:30:00Z"}', 500, 500);
    insert into revenue_receipt_tenders (id, organization_id, receipt_id, method, applied_cents, received_cents)
      values
      ('metrics-tender-old', 'metrics-org', 'metrics-receipt-old', 'pix', 700, null),
      ('metrics-tender-1', 'metrics-org', 'metrics-receipt-1', 'pix', 1000, null),
      ('metrics-tender-2', 'metrics-org', 'metrics-receipt-2', 'cash', 2000, 2000),
      ('metrics-tender-r', 'metrics-org', 'metrics-receipt-r', 'cash', 500, 500);
    insert into commission_facts
      (id, organization_id, receipt_id, receipt_line_id, kind, professional_id, professional_name, service_id, service_name, rule, net_base_cents, commission_cents, barbershop_share_cents, local_date, occurred_at)
      values
      ('metrics-fact-1', 'metrics-org', 'metrics-receipt-1', 'metrics-line-1', 'earned', 'metrics-pro-1', 'Ana', 'metrics-service-1', 'Corte', '{"kind":"percentage","basisPoints":2000,"source":"default","policyVersion":1}', 1000, 200, 800, '2026-09-10', '2026-09-10T10:30:00Z'),
      ('metrics-fact-2', 'metrics-org', 'metrics-receipt-2', 'metrics-line-2', 'earned', 'metrics-pro-2', 'Bia', 'metrics-service-2', 'Barba', '{"kind":"percentage","basisPoints":2500,"source":"default","policyVersion":1}', 2000, 500, 1500, '2026-09-11', '2026-09-11T10:20:00Z'),
      ('metrics-fact-r', 'metrics-org', 'metrics-receipt-r', 'metrics-line-r', 'earned', 'metrics-pro-1', 'Ana', 'metrics-service-1', 'Corte', '{"kind":"percentage","basisPoints":2000,"source":"default","policyVersion":1}', 500, 100, 400, '2026-09-12', '2026-09-12T10:30:00Z');
    insert into commission_facts
      (id, organization_id, receipt_id, receipt_line_id, original_fact_id, kind, professional_id, professional_name, service_id, service_name, rule, net_base_cents, commission_cents, barbershop_share_cents, local_date, occurred_at)
      values ('metrics-fact-rv', 'metrics-org', 'metrics-receipt-r', 'metrics-line-r', 'metrics-fact-r', 'reversal', 'metrics-pro-1', 'Ana', 'metrics-service-1', 'Corte', '{"kind":"percentage","basisPoints":2000,"source":"default","policyVersion":1}', -500, -100, -400, '2026-09-12', '2026-09-12T11:00:00Z');
    insert into revenue_receipt_reversals
      (id, organization_id, receipt_id, cash_day_id, snapshot, reason, actor_user_id, actor_display_name, reversed_at)
      values ('metrics-reversal', 'metrics-org', 'metrics-receipt-r', 'metrics-day-r', '{"totalCents":-500,"lines":[{"receiptLineId":"metrics-line-r","netCents":-500}],"tenders":[{"receiptTenderId":"metrics-tender-r","method":"cash","appliedCents":-500}]}', 'Correção de teste', 'metrics-owner', 'Owner', '2026-09-12T11:00:00Z');
    insert into scheduling_appointments
      (id, organization_id, unit_id, professional_id, service_id, client_id, customer_name, professional_name, service_name, unit_name, timezone, date, start, "end", starts_at, ends_at, duration_minutes, price_cents, status)
      values
      ('metrics-appt-c', 'metrics-org', 'metrics-unit-1', 'metrics-pro-1', 'metrics-service-1', 'metrics-client-returning', 'Recorrente', 'Ana', 'Corte', 'Centro', 'America/Recife', '2026-09-15', '10:00', '10:30', '2026-09-15T13:00:00Z', '2026-09-15T13:30:00Z', 30, 1000, 'canceled'),
      ('metrics-appt-n', 'metrics-org', 'metrics-unit-2', 'metrics-pro-2', 'metrics-service-2', 'metrics-client-new', 'Novo', 'Bia', 'Barba', 'Norte', 'America/Recife', '2026-09-16', '11:00', '11:20', '2026-09-16T14:00:00Z', '2026-09-16T14:20:00Z', 20, 2000, 'no-show');
  `)
})

afterAll(async () => {
  await pool.query(`
    delete from scheduling_appointments where organization_id = 'metrics-org';
    delete from commission_facts where organization_id = 'metrics-org';
    delete from revenue_receipt_reversals where organization_id = 'metrics-org';
    delete from revenue_receipt_tenders where organization_id = 'metrics-org';
    delete from revenue_receipt_lines where organization_id = 'metrics-org';
    delete from revenue_receipts where organization_id = 'metrics-org';
    delete from revenue_cash_days where organization_id = 'metrics-org';
    delete from revenue_checkouts where organization_id = 'metrics-org';
    delete from service_desk_completed_handoffs where organization_id = 'metrics-org';
    delete from service_desk_visits where organization_id = 'metrics-org';
    delete from clients where organization_id = 'metrics-org';
    delete from professionals where organization_id = 'metrics-org';
    delete from services where organization_id = 'metrics-org';
    delete from units where organization_id = 'metrics-org';
    delete from idp_members where organization_id = 'metrics-org';
    delete from idp_users where id like 'metrics-%';
    delete from idp_organizations where id = 'metrics-org';
  `)
  await pool.end()
})

describe.sequential("truthful report metrics", () => {
  it("applies every summary filter without leaking reversed revenue into active totals", async () => {
    for (const filter of [
      { unitId: "metrics-unit-2" },
      { professionalId: "metrics-pro-2" },
      { serviceId: "metrics-service-2" },
      { paymentMethod: "cash" as const },
    ]) {
      const result = await reporting.summary(actor, { ...range, ...filter })
      expect(result.summary).toMatchObject({
        receiptCount: 1,
        netRevenueCents: 2000,
        performedItems: 1,
        grossCents: 2000,
      })
    }
  })

  it("derives a distinct truthful result for all six report types", async () => {
    const results = await Promise.all(
      [
        "sales_revenue",
        "professional_performance",
        "commissions",
        "new_returning_customers",
        "cancellations_no_shows",
        "cash_payments",
      ].map(async (type) =>
        values(
          await reporting.report(actor, type as ReportType, range, config(type as ReportType)),
        ),
      ),
    )
    expect(results[0]).toMatchObject({ "Vendas registradas": "3", "Vendas revertidas": "1" })
    expect(results[1]).toMatchObject({ "Ana — serviços": "1", "Bia — serviços": "1" })
    expect(results[2]).toMatchObject({
      "Ana — comissão (centavos)": "200",
      "Bia — comissão (centavos)": "500",
    })
    expect(results[3]).toEqual({ "Clientes novos": "1", "Clientes recorrentes": "1" })
    expect(results[4]).toEqual({ Cancelamentos: "1", Ausências: "1" })
    expect(results[5]).toMatchObject({
      "Pix — líquido (centavos)": "1000",
      "Dinheiro — líquido (centavos)": "1500",
    })
    expect(new Set(results.map((result) => JSON.stringify(result))).size).toBe(6)
  })

  it("applies every supported filter at its authoritative fact boundary", async () => {
    const salesConfig = config("sales_revenue")
    for (const filter of [
      { unitId: "metrics-unit-2" },
      { professionalId: "metrics-pro-2" },
      { serviceId: "metrics-service-2" },
      { paymentMethod: "cash" as const },
    ]) {
      const result = values(
        await reporting.report(actor, "sales_revenue", { ...range, ...filter }, salesConfig),
      )
      const metric =
        "paymentMethod" in filter
          ? result["Valor via Dinheiro (centavos)"]
          : "professionalId" in filter || "serviceId" in filter
            ? result["Receita dos itens filtrados (centavos)"]
            : result["Faturamento líquido (centavos)"]
      expect(metric).toBe(filter.paymentMethod ? "1500" : "2000")
    }
    for (const filter of [
      { unitId: "metrics-unit-2" },
      { professionalId: "metrics-pro-2" },
      { serviceId: "metrics-service-2" },
    ])
      expect(
        values(
          await reporting.report(
            actor,
            "professional_performance",
            { ...range, ...filter },
            config("professional_performance"),
          ),
        ),
      ).toEqual({ "Bia — serviços": "1", "Bia — receita (centavos)": "2000" })
    for (const filter of [{ unitId: "metrics-unit-2" }, { professionalId: "metrics-pro-2" }])
      expect(
        values(
          await reporting.report(
            actor,
            "commissions",
            { ...range, ...filter },
            config("commissions"),
          ),
        ),
      ).toMatchObject({ "Bia — comissão (centavos)": "500" })
    for (const filter of [
      { unitId: "metrics-unit-2" },
      { professionalId: "metrics-pro-2" },
      { serviceId: "metrics-service-2" },
    ])
      expect(
        values(
          await reporting.report(
            actor,
            "new_returning_customers",
            { ...range, ...filter },
            config("new_returning_customers"),
          ),
        ),
      ).toEqual({ "Clientes novos": "1", "Clientes recorrentes": "0" })
    for (const filter of [
      { unitId: "metrics-unit-2" },
      { professionalId: "metrics-pro-2" },
      { serviceId: "metrics-service-2" },
    ])
      expect(
        values(
          await reporting.report(
            actor,
            "cancellations_no_shows",
            { ...range, ...filter },
            config("cancellations_no_shows"),
          ),
        ),
      ).toEqual({ Cancelamentos: "0", Ausências: "1" })
    expect(
      values(
        await reporting.report(
          actor,
          "cash_payments",
          { ...range, unitId: "metrics-unit-1" },
          config("cash_payments"),
        ),
      ),
    ).toMatchObject({ "Pix — líquido (centavos)": "1000" })
    expect(
      values(
        await reporting.report(
          actor,
          "cash_payments",
          { ...range, unitId: "metrics-unit-1", paymentMethod: "cash" },
          config("cash_payments"),
        ),
      ),
    ).toEqual({ "Dinheiro — lançamentos": "1", "Dinheiro — líquido (centavos)": "-500" })
  })
})
