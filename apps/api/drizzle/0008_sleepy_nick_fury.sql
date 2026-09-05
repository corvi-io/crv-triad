ALTER TABLE "access_requests" DROP CONSTRAINT "access_requests_requester_membership_id_idp_members_id_fk";
--> statement-breakpoint
CREATE UNIQUE INDEX "idp_members_organization_id_unique" ON "idp_members" USING btree ("organization_id","id");--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_tenant_membership_fk" FOREIGN KEY ("organization_id","requester_membership_id") REFERENCES "public"."idp_members"("organization_id","id") ON DELETE restrict ON UPDATE no action;
