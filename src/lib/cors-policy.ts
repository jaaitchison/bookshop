function configuredOrigins() {
  return [process.env.APP_ORIGIN, ...(process.env.ALLOWED_CORS_ORIGINS?.split(",") ?? [])]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

export function isRequestOriginAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const requestOrigin = new URL(request.url).origin;
  return origin === requestOrigin || configuredOrigins().includes(origin);
}

export function applyCorsHeaders(headers: Headers, request: Request) {
  const origin = request.headers.get("origin");
  if (origin && isRequestOriginAllowed(request)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.append("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Stripe-Signature, X-CSRF-Token");
  headers.set("Access-Control-Max-Age", "600");
}
