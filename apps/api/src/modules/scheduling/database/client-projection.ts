import { sql } from "drizzle-orm"
/** Correlated indexed lookup within the bounded client list statement (no application N+1). */
export const nextClientAppointment = sql<string | null>`(
  select a.date::text || 'T' || a.start from scheduling_appointments a
  where a.organization_id = ${sql.identifier("clients")}.${sql.identifier("organization_id")}
    and a.client_id = ${sql.identifier("clients")}.${sql.identifier("id")}
    and a.starts_at >= now() and a.status in ('scheduled', 'confirmed', 'arrived')
  order by a.starts_at, a.id limit 1
)`
