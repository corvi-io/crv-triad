import { sql } from "drizzle-orm"
import { client } from "../../clients/database/schema.js"
/** Correlated indexed aggregate within the bounded client list statement (no application N+1). */
export const nextClientAppointment = sql<string | null>`(
  select min(a.starts_at)::text from scheduling_appointments a
  where a.organization_id = ${client.organizationId} and a.client_id = ${client.id}
    and a.starts_at >= now() and a.status in ('scheduled', 'confirmed', 'arrived')
)`
