import dns from "node:dns";

export const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);

export const jwtSecret = process.env.JWT_SECRET ?? "crowdfaq-development-secret-change-me-now";

export const frontendOrigins = (process.env.FRONTEND_ORIGIN ?? process.env.CLIENT_URL ?? "http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim());

export function validateEnv() {
  if (!process.env.JWT_SECRET) {
    console.warn("JWT_SECRET is not configured. Using a development-only fallback secret.");
  }
  if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(",").map((server) => server.trim()));
  }
}
