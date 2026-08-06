import { getPrismaClient } from "@/src/lib/prisma";

export async function GET() {
  const prisma = getPrismaClient();
  if (!prisma) return Response.json({ status: "unhealthy", database: "unconfigured" }, { status: 503 });
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "healthy", database: "connected" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ status: "unhealthy", database: "unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
