-- On-premise login enforcement: per-tenant source IP/CIDR allowlist.
ALTER TABLE "Tenant" ADD COLUMN "allowedIps" TEXT[] DEFAULT ARRAY[]::TEXT[];