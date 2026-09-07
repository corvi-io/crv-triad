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
      ('metrics-pro-user-2', 'Bia', 'bia@example.invalid', true),
      ('metrics-pro-user-3', 'Cara', 'cara@example.invalid', true);
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
      ('metrics-pro-2', 'metrics-org', 'Barbeira', 'metrics-pro-user-2'),
      ('metrics-pro-3', 'metrics-org', 'Barbeira', 'metrics-pro-user-3');
    insert into clients (id, organization_id, name, normalized_phone)
      values
      ('metrics-client-returning', 'metrics-org', 'Cliente Recorrente', '5581999990001'),
      ('metrics-client-new', 'metrics-org', 'Cliente Novo', '5581999990002');
    insert into service_desk_visits
      (id, organization_id, unit_id, client_id, source, status, customer_display_name, unit_name, timezone, requested_service_id, requested_professional_id, arrived_at)
      values
      ('metrics-visit-old', 'metrics-org', 'metrics-unit-1', 'metrics-client-returning', 'walk-in', 'completed', 'Recorrente', 'Centro', 'America/Recife', 'metrics-service-1', 'metrics-pro-1', '2026-08-20T10:00:00Z'),
      ('metrics-visit-new-reversed-old', 'metrics-org', 'metrics-unit-2', 'metrics-client-new', 'walk-in', 'completed', 'Novo', 'Norte', 'America/Recife', 'metrics-service-2', 'metrics-pro-2', '2026-08-25T10:00:00Z'),
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
      ('metrics-receipt-new-reversed-old', 'metrics-org', 'checkout-metrics-visit-new-reversed-old', 'metrics-day-old', '2026-08-25', 'America/Recife', 'reversed', 400, 0, 0, 400, 1, 1, 'metrics-owner', 'Owner'),
      ('metrics-receipt-1', 'metrics-org', 'checkout-metrics-visit-1', 'metrics-day-1', '2026-09-10', 'America/Recife', 'active', 1000, 0, 0, 1000, 1, 1, 'metrics-owner', 'Owner'),
      ('metrics-receipt-2', 'metrics-org', 'checkout-metrics-visit-2', 'metrics-day-2', '2026-09-11', 'America/Recife', 'active', 2000, 0, 0, 2000, 1, 1, 'metrics-owner', 'Owner'),
      ('metrics-receipt-r', 'metrics-org', 'checkout-metrics-visit-reversed', 'metrics-day-r', '2026-09-12', 'America/Recife', 'reversed', 500, 0, 0, 500, 1, 1, 'metrics-owner', 'Owner');
    insert into revenue_receipt_lines
      (id, organization_id, receipt_id, checkout_line_id, sequence, snapshot, gross_cents, net_cents)
      values
      ('metrics-line-old', 'metrics-org', 'metrics-receipt-old', 'cl-old', 1, '{"professionalId":"metrics-pro-1","professionalName":"Ana","serviceId":"metrics-service-1","serviceName":"Corte","itemId":"i-old","handoffPriceCents":700,"startedAt":"2026-08-20T10:00:00Z","finishedAt":"2026-08-20T10:30:00Z"}', 700, 700),
      ('metrics-line-new-reversed-old', 'metrics-org', 'metrics-receipt-new-reversed-old', 'cl-new-reversed-old', 1, '{"professionalId":"metrics-pro-2","professionalName":"Bia","serviceId":"metrics-service-2","serviceName":"Barba","itemId":"i-new-reversed-old","handoffPriceCents":400,"startedAt":"2026-08-25T10:00:00Z","finishedAt":"2026-08-25T10:20:00Z"}', 400, 400),
      ('metrics-line-1', 'metrics-org', 'metrics-receipt-1', 'cl-1', 1, '{"professionalId":"metrics-pro-1","professionalName":"Ana","serviceId":"metrics-service-1","serviceName":"Corte","itemId":"i-1","handoffPriceCents":1000,"startedAt":"2026-09-10T10:00:00Z","finishedAt":"2026-09-10T10:30:00Z"}', 1000, 999),
      ('metrics-line-2', 'metrics-org', 'metrics-receipt-2', 'cl-2', 1, '{"professionalId":"metrics-pro-2","professionalName":"Bia","serviceId":"metrics-service-2","serviceName":"Barba","itemId":"i-2","handoffPriceCents":2000,"startedAt":"2026-09-11T10:00:00Z","finishedAt":"2026-09-11T10:20:00Z"}', 2000, 2000),
      ('metrics-line-r', 'metrics-org', 'metrics-receipt-r', 'cl-r', 1, '{"professionalId":"metrics-pro-1","professionalName":"Ana","serviceId":"metrics-service-1","serviceName":"Corte","itemId":"i-r","handoffPriceCents":500,"startedAt":"2026-09-12T10:00:00Z","finishedAt":"2026-09-12T10:30:00Z"}', 500, 500);
    insert into revenue_receipt_tenders (id, organization_id, receipt_id, method, applied_cents, received_cents)
      values
      ('metrics-tender-old', 'metrics-org', 'metrics-receipt-old', 'pix', 700, null),
      ('metrics-tender-new-reversed-old', 'metrics-org', 'metrics-receipt-new-reversed-old', 'pix', 400, null),
      ('metrics-tender-1-pix', 'metrics-org', 'metrics-receipt-1', 'pix', 333, null),
      ('metrics-tender-1-cash', 'metrics-org', 'metrics-receipt-1', 'cash', 667, 667),
      ('metrics-tender-2', 'metrics-org', 'metrics-receipt-2', 'cash', 2000, 2000),
      ('metrics-tender-r', 'metrics-org', 'metrics-receipt-r', 'cash', 500, 500);
    insert into commission_facts
      (id, organization_id, receipt_id, receipt_line_id, kind, professional_id, professional_name, service_id, service_name, rule, net_base_cents, commission_cents, barbershop_share_cents, local_date, occurred_at)
      values
      ('metrics-fact-1', 'metrics-org', 'metrics-receipt-1', 'metrics-line-1', 'earned', 'metrics-pro-1', 'Ana', 'metrics-service-1', 'Corte', '{"kind":"percentage","basisPoints":2000,"source":"default","policyVersion":1}', 999, 200, 799, '2026-09-10', '2026-09-10T10:30:00Z'),
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
      ('metrics-appt-completed-1', 'metrics-org', 'metrics-unit-1', 'metrics-pro-1', 'metrics-service-1', 'metrics-client-returning', 'Recorrente', 'Ana', 'Corte', 'Centro', 'America/Recife', '2026-09-10', '09:00', '09:30', '2026-09-10T12:00:00Z', '2026-09-10T12:30:00Z', 30, 1000, 'completed'),
      ('metrics-appt-completed-2', 'metrics-org', 'metrics-unit-2', 'metrics-pro-2', 'metrics-service-2', 'metrics-client-new', 'Novo', 'Bia', 'Barba', 'Norte', 'America/Recife', '2026-09-11', '09:00', '09:20', '2026-09-11T12:00:00Z', '2026-09-11T12:20:00Z', 20, 2000, 'completed'),
      ('metrics-appt-c', 'metrics-org', 'metrics-unit-1', 'metrics-pro-1', 'metrics-service-1', 'metrics-client-returning', 'Recorrente', 'Ana', 'Corte', 'Centro', 'America/Recife', '2026-09-15', '10:00', '10:30', '2026-09-15T13:00:00Z', '2026-09-15T13:30:00Z', 30, 1000, 'canceled'),
      ('metrics-appt-n', 'metrics-org', 'metrics-unit-2', 'metrics-pro-2', 'metrics-service-2', 'metrics-client-new', 'Novo', 'Bia', 'Barba', 'Norte', 'America/Recife', '2026-09-16', '11:00', '11:20', '2026-09-16T14:00:00Z', '2026-09-16T14:20:00Z', 20, 2000, 'no-show'),
      ('metrics-appt-cara', 'metrics-org', 'metrics-unit-1', 'metrics-pro-3', 'metrics-service-1', 'metrics-client-returning', 'Recorrente', 'Cara', 'Corte', 'Centro', 'America/Recife', '2026-09-17', '12:00', '12:30', '2026-09-17T15:00:00Z', '2026-09-17T15:30:00Z', 30, 1000, 'canceled');
    insert into idp_organizations (id, name, slug) values ('metrics-other', 'Other', 'metrics-other');
    insert into idp_users (id, name, email, email_verified) values
      ('metrics-other-owner', 'Other owner', 'other-owner@example.invalid', true),
      ('metrics-other-pro-user', 'Other pro', 'other-pro@example.invalid', true);
    insert into units (id, organization_id, code, normalized_code, name, address, timezone, opening_start, opening_end)
      values ('metrics-other-unit', 'metrics-other', 'MO', 'mo', 'Other', 'Other', 'America/Recife', '08:00', '18:00');
    insert into services (id, organization_id, name, normalized_name, category, description, duration_minutes, price_cents)
      values ('metrics-other-service', 'metrics-other', 'Other', 'other', 'Other', 'Other', 30, 9999);
    insert into professionals (id, organization_id, role, global_user_id)
      values ('metrics-other-pro', 'metrics-other', 'Other', 'metrics-other-pro-user');
    insert into clients (id, organization_id, name, normalized_phone)
      values ('metrics-other-client', 'metrics-other', 'Other client', '5581999999999');
    insert into service_desk_visits
      (id, organization_id, unit_id, client_id, source, status, customer_display_name, unit_name, timezone, requested_service_id, requested_professional_id, arrived_at)
      values ('metrics-other-visit', 'metrics-other', 'metrics-other-unit', 'metrics-other-client', 'walk-in', 'completed', 'Other client', 'Other', 'America/Recife', 'metrics-other-service', 'metrics-other-pro', '2026-09-10T10:00:00Z');
    insert into service_desk_completed_handoffs (id, organization_id, visit_id, payload)
      values ('metrics-other-handoff', 'metrics-other', 'metrics-other-visit', '{"schemaVersion":1,"tenantId":"metrics-other","unitId":"metrics-other-unit","unitName":"Other","timezone":"America/Recife","visitId":"metrics-other-visit","clientId":"metrics-other-client","appointmentId":null,"customerDisplayName":"Other client","finishedAt":"2026-09-10T10:30:00Z","visitVersion":1,"items":[]}');
    insert into revenue_checkouts
      (id, organization_id, unit_id, visit_id, client_id, customer_display_name, unit_name, timezone, handoff_version, finished_at, status)
      values ('metrics-other-checkout', 'metrics-other', 'metrics-other-unit', 'metrics-other-visit', 'metrics-other-client', 'Other client', 'Other', 'America/Recife', 1, '2026-09-10T10:30:00Z', 'registered');
    insert into revenue_cash_days
      (id, organization_id, unit_id, local_date, timezone, opening_cash_cents, opened_by, opened_by_name)
      values ('metrics-other-day', 'metrics-other', 'metrics-other-unit', '2026-09-10', 'America/Recife', 0, 'metrics-other-owner', 'Other owner');
    insert into revenue_receipts
      (id, organization_id, checkout_id, cash_day_id, local_date, timezone, status, subtotal_cents, discount_cents, surcharge_cents, total_cents, checkout_version, policy_version, actor_user_id, actor_display_name)
      values ('metrics-other-receipt', 'metrics-other', 'metrics-other-checkout', 'metrics-other-day', '2026-09-10', 'America/Recife', 'active', 9999, 0, 0, 9999, 1, 1, 'metrics-other-owner', 'Other owner');
    insert into revenue_receipt_lines
      (id, organization_id, receipt_id, checkout_line_id, sequence, snapshot, gross_cents, net_cents)
      values ('metrics-other-line', 'metrics-other', 'metrics-other-receipt', 'metrics-other-cl', 1, '{"professionalId":"metrics-other-pro","professionalName":"Other pro","serviceId":"metrics-other-service","serviceName":"Other","itemId":"other","handoffPriceCents":9999,"startedAt":"2026-09-10T10:00:00Z","finishedAt":"2026-09-10T10:30:00Z"}', 9999, 9999);
    insert into revenue_receipt_tenders (id, organization_id, receipt_id, method, applied_cents)
      values ('metrics-other-tender', 'metrics-other', 'metrics-other-receipt', 'pix', 9999);
    insert into commission_facts
      (id, organization_id, receipt_id, receipt_line_id, kind, professional_id, professional_name, service_id, service_name, rule, net_base_cents, commission_cents, barbershop_share_cents, local_date, occurred_at)
      values ('metrics-other-fact', 'metrics-other', 'metrics-other-receipt', 'metrics-other-line', 'earned', 'metrics-other-pro', 'Other pro', 'metrics-other-service', 'Other', '{"kind":"percentage","basisPoints":2222,"source":"default","policyVersion":1}', 9999, 7777, 2222, '2026-09-10', '2026-09-10T10:30:00Z');
    insert into scheduling_appointments
      (id, organization_id, unit_id, professional_id, service_id, client_id, customer_name, professional_name, service_name, unit_name, timezone, date, start, "end", starts_at, ends_at, duration_minutes, price_cents, status)
      values ('metrics-other-appt', 'metrics-other', 'metrics-other-unit', 'metrics-other-pro', 'metrics-other-service', 'metrics-other-client', 'Other client', 'Other pro', 'Other', 'Other', 'America/Recife', '2026-09-10', '10:00', '10:30', '2026-09-10T13:00:00Z', '2026-09-10T13:30:00Z', 30, 8888, 'canceled');
  `)
})

afterAll(async () => {
  await pool.query(`
    delete from scheduling_appointments where organization_id in ('metrics-org', 'metrics-other');
    delete from commission_facts where organization_id in ('metrics-org', 'metrics-other');
    delete from revenue_receipt_reversals where organization_id in ('metrics-org', 'metrics-other');
    delete from revenue_receipt_tenders where organization_id in ('metrics-org', 'metrics-other');
    delete from revenue_receipt_lines where organization_id in ('metrics-org', 'metrics-other');
    delete from revenue_receipts where organization_id in ('metrics-org', 'metrics-other');
    delete from revenue_cash_days where organization_id in ('metrics-org', 'metrics-other');
    delete from revenue_checkouts where organization_id in ('metrics-org', 'metrics-other');
    delete from service_desk_completed_handoffs where organization_id in ('metrics-org', 'metrics-other');
    delete from service_desk_visits where organization_id in ('metrics-org', 'metrics-other');
    delete from clients where organization_id in ('metrics-org', 'metrics-other');
    delete from professionals where organization_id in ('metrics-org', 'metrics-other');
    delete from services where organization_id in ('metrics-org', 'metrics-other');
    delete from units where organization_id in ('metrics-org', 'metrics-other');
    delete from idp_members where organization_id = 'metrics-org';
    delete from idp_users where id like 'metrics-%';
    delete from idp_organizations where id in ('metrics-org', 'metrics-other');
  `)
  await pool.end()
})

describe.sequential("truthful report metrics", () => {
  it("keeps a second tenant's sentinel facts out of summary and all six reports", async () => {
    const summary = await reporting.summary(actor, range)
    expect(summary.summary.netRevenueCents).toBe(2999)
    const reports = await Promise.all(
      (
        [
          "sales_revenue",
          "professional_performance",
          "commissions",
          "new_returning_customers",
          "cancellations_no_shows",
          "cash_payments",
        ] as const
      ).map((type) => reporting.report(actor, type, range, config(type))),
    )
    const serialized = JSON.stringify(reports)
    for (const sentinel of ["Other", "9999", "7777", "8888"])
      expect(serialized).not.toContain(sentinel)
    expect(values(reports[0])["Receita líquida (centavos)"]).toBe("2499")
    expect(values(reports[1])["Cara — cancelamentos"]).toBe("1")
    expect(values(reports[2])["Bia — comissão (centavos)"]).toBe("500")
    expect(values(reports[3])["Clientes únicos identificados"]).toBe("2")
    expect(values(reports[4])["Agendamentos no denominador"]).toBe("5")
    expect(values(reports[5])["Dinheiro — líquido (centavos)"]).toBe("2167")
  })

  it("applies every summary filter without leaking reversed revenue into active totals", async () => {
    for (const filter of [
      { unitId: "metrics-unit-2" },
      { professionalId: "metrics-pro-2" },
      { serviceId: "metrics-service-2" },
    ]) {
      const result = await reporting.summary(actor, { ...range, ...filter })
      expect(result.summary).toMatchObject({
        receiptCount: 1,
        netRevenueCents: 2000,
        performedItems: 1,
        grossCents: 2000,
      })
    }
    const cash = await reporting.summary(actor, { ...range, paymentMethod: "cash" })
    expect(cash.summary).toMatchObject({
      receiptCount: 2,
      netRevenueCents: 2666,
      performedItems: 2,
      grossCents: 2667,
    })
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
    expect(results[0]).toMatchObject({
      "Serviços concluídos": "2",
      "Vendas pagas": "2",
      "Receita bruta (centavos)": "3000",
      "Receita líquida (centavos)": "2499",
      "Estornos (centavos)": "500",
      "Período anterior — receita líquida (centavos)": "300",
      "Variação contra período anterior (centavos)": "2199",
    })
    expect(results[1]).toMatchObject({
      "Ana — agendamentos concluídos": "1",
      "Ana — ticket médio (centavos)": "999",
      "Ana — cancelamentos": "1",
      "Bia — agendamentos concluídos": "1",
      "Bia — ausências": "1",
      "Cara — agendamentos concluídos": "0",
      "Cara — receita (centavos)": "0",
      "Cara — cancelamentos": "1",
    })
    expect(results[2]).toMatchObject({
      "Ana — comissão (centavos)": "200",
      "Ana — receita de serviços (centavos)": "999",
      "Ana — barbearia (centavos)": "799",
      "Ana — fatos": "2",
      "Ana — estornos": "1",
      "Bia — comissão (centavos)": "500",
    })
    expect(results[3]).toMatchObject({
      "Clientes únicos identificados": "2",
      "Clientes novos": "1",
      "Clientes recorrentes": "1",
      "Clientes sem identidade estável": "0",
      "Novos (basis points)": "5000",
      "Recorrentes (basis points)": "5000",
    })
    expect(results[4]).toMatchObject({
      Cancelamentos: "2",
      Ausências: "1",
      "Agendamentos no denominador": "5",
      "Taxa de cancelamento (basis points)": "4000",
      "Taxa de ausência (basis points)": "2000",
      "Valor afetado (centavos)": "4000",
    })
    expect(results[5]).toMatchObject({
      "Pix — líquido (centavos)": "333",
      "Dinheiro — recebido bruto (centavos)": "2667",
      "Dinheiro — estornado (centavos)": "500",
      "Dinheiro — líquido (centavos)": "2167",
    })
    expect(new Set(results.map((result) => JSON.stringify(result))).size).toBe(6)
  })

  it("classifies a client as new when their only earlier receipt was reversed", async () => {
    const customers = values(
      await reporting.report(
        actor,
        "new_returning_customers",
        { ...range, professionalId: "metrics-pro-2" },
        config("new_returning_customers"),
      ),
    )
    expect(customers).toMatchObject({
      "Clientes únicos identificados": "1",
      "Clientes novos": "1",
      "Clientes recorrentes": "0",
      "Novos (basis points)": "10000",
    })
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
      expect(result["Receita líquida (centavos)"]).toBe("paymentMethod" in filter ? "2166" : "2000")
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
      ).toMatchObject({
        "Bia — agendamentos concluídos": "1",
        "Bia — receita (centavos)": "2000",
        "Bia — ticket médio (centavos)": "2000",
      })
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
      ).toMatchObject({ "Clientes novos": "1", "Clientes recorrentes": "0" })
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
      ).toMatchObject({ Cancelamentos: "0", Ausências: "1", "Agendamentos no denominador": "2" })
    expect(
      values(
        await reporting.report(
          actor,
          "cash_payments",
          { ...range, unitId: "metrics-unit-1" },
          config("cash_payments"),
        ),
      ),
    ).toMatchObject({ "Pix — líquido (centavos)": "333" })
    expect(
      values(
        await reporting.report(
          actor,
          "cash_payments",
          { ...range, unitId: "metrics-unit-1", paymentMethod: "cash" },
          config("cash_payments"),
        ),
      ),
    ).toMatchObject({
      "Dinheiro — recibos": "1",
      "Dinheiro — recebido bruto (centavos)": "667",
      "Dinheiro — estornado (centavos)": "500",
      "Dinheiro — líquido (centavos)": "167",
    })
  })

  it("allocates split tenders deterministically before combining professional, service, and method", async () => {
    const filters = {
      ...range,
      professionalId: "metrics-pro-1",
      serviceId: "metrics-service-1",
      paymentMethod: "cash" as const,
    }
    const summary = await reporting.summary(actor, filters)
    expect(summary.summary).toMatchObject({
      receiptCount: 1,
      performedItems: 1,
      grossCents: 667,
      netRevenueCents: 666,
    })
    const report = values(
      await reporting.report(actor, "sales_revenue", filters, config("sales_revenue")),
    )
    expect(report).toMatchObject({
      "Receita bruta (centavos)": "667",
      "Estornos (centavos)": "500",
      "Receita líquida (centavos)": "166",
    })
    const mismatchedLine = await reporting.summary(actor, {
      ...range,
      professionalId: "metrics-pro-1",
      serviceId: "metrics-service-2",
    })
    expect(mismatchedLine.summary).toMatchObject({
      receiptCount: 0,
      performedItems: 0,
      grossCents: 0,
      netRevenueCents: 0,
    })
  })
})
