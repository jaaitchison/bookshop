import type { AccountRole } from "@/src/types/account";

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return (
    matchesRoute(pathname, "/admin") ||
    matchesRoute(pathname, "/studio") ||
    matchesRoute(pathname, "/library") ||
    matchesRoute(pathname, "/account") ||
    matchesRoute(pathname, "/checkout")
  );
}

export function getRequiredRoleForPath(
  pathname: string,
): AccountRole | null {
  if (!isProtectedPath(pathname)) {
    return null;
  }

  if (matchesRoute(pathname, "/admin")) {
    return "admin";
  }

  if (matchesRoute(pathname, "/studio")) {
    return "writer";
  }

  return "reader";
}
