import "dotenv/config";
import nextConfig from "../next.config";
import { POST as signin } from "../app/api/auth/signin/route";
import { isRequestOriginAllowed } from "../src/lib/cors-policy";
import { EnvironmentValidationError, validateServerEnvironment } from "../src/lib/environment";
import { enforceRequestRateLimit, resetRateLimitsForTesting } from "../src/lib/request-rate-limit";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log("\nSECTION 12.1 - Security hardening runtime verification\n");

  console.log("1. Typed production environment validation");
  let invalidRejected = false;
  try {
    validateServerEnvironment({ NODE_ENV: "production", DATABASE_URL: "sqlite:test.db" });
  } catch (error) {
    invalidRejected = error instanceof EnvironmentValidationError;
  }
  assert(invalidRejected, "Invalid production environment was accepted.");
  const valid = validateServerEnvironment({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:password@example.test:5432/bookshop",
    APP_ORIGIN: "https://bookshop.example",
    STRIPE_SECRET_KEY: "sk_test_security_123",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_security_123",
    STRIPE_WEBHOOK_SECRET: "whsec_security_123",
  }, { requireProductionOrigin: true, requirePayments: true });
  assert(valid.APP_ORIGIN === "https://bookshop.example", "Valid environment did not parse.");
  console.log("   PASS - malformed database/origin/payment configuration fails before use.");

  console.log("\n2. Explicit same-origin CORS policy");
  const originalAppOrigin = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "https://bookshop.example";
  try {
    assert(isRequestOriginAllowed(new Request("https://bookshop.example/api/books", { headers: { origin: "https://bookshop.example" } })), "Same origin was rejected.");
    assert(!isRequestOriginAllowed(new Request("https://bookshop.example/api/books", { headers: { origin: "https://hostile.example" } })), "Hostile origin was accepted.");
    assert(isRequestOriginAllowed(new Request("https://bookshop.example/api/webhooks/stripe")), "Origin-free server webhook was rejected.");
  } finally {
    if (originalAppOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = originalAppOrigin;
  }
  console.log("   PASS - browser origins are allowlisted while server-to-server webhooks remain available.");

  console.log("\n3. Shared request throttling contract");
  resetRateLimitsForTesting();
  const limitedRequest = () => new Request("http://localhost/api/test", { headers: { "x-forwarded-for": "203.0.113.10" } });
  assert(enforceRequestRateLimit(limitedRequest(), "security:test", { limit: 2, windowMs: 60_000 }) === null, "First request was limited.");
  assert(enforceRequestRateLimit(limitedRequest(), "security:test", { limit: 2, windowMs: 60_000 }) === null, "Second request was limited.");
  const limited = enforceRequestRateLimit(limitedRequest(), "security:test", { limit: 2, windowMs: 60_000 });
  assert(limited?.status === 429 && limited.headers.has("retry-after") && limited.headers.get("cache-control")?.includes("no-store"), "Rate limit response is incomplete.");
  console.log("   PASS - excess requests receive non-cacheable 429 responses with retry metadata.");

  console.log("\n4. Authentication route enforcement");
  resetRateLimitsForTesting();
  let finalStatus = 0;
  for (let attempt = 0; attempt < 11; attempt += 1) {
    const response = await signin(new Request("http://localhost/api/auth/signin", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.20" },
      body: JSON.stringify({}),
    }));
    finalStatus = response.status;
  }
  assert(finalStatus === 429, "Signin route did not enforce its request limit.");
  console.log("   PASS - repeated authentication attempts are stopped before credential work.");

  console.log("\n5. Browser security headers");
  const rules = await nextConfig.headers?.();
  const headers = new Map((rules?.[0]?.headers ?? []).map((header) => [header.key.toLowerCase(), header.value]));
  assert(headers.get("content-security-policy")?.includes("frame-ancestors 'none'"), "Content Security Policy is incomplete.");
  assert(headers.get("x-content-type-options") === "nosniff" && headers.get("referrer-policy") === "strict-origin-when-cross-origin", "Core security headers are missing.");
  console.log("   PASS - CSP, framing, MIME, referrer and browser capability policies are configured.");

  console.log("\nSECTION 12.1 SECURITY HARDENING PASSED.\n");
}

main().catch((error) => {
  console.error("\nSECTION 12.1 SECURITY HARDENING FAILED.");
  console.error(error);
  process.exitCode = 1;
});
