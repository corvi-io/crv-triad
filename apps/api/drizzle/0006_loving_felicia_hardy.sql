ALTER TABLE "client_notes" DROP CONSTRAINT "client_notes_client_id_clients_id_fk";
--> statement-breakpoint
CREATE UNIQUE INDEX "clients_organization_id_unique" ON "clients" USING btree ("organization_id","id");--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_tenant_client_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE cascade ON UPDATE no action;
