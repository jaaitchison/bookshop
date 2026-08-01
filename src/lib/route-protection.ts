import type { AccountRole } from "@/src/types/account";

export function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/library") ||
    pathname.startsWith("/checkout")
  );
}

export function getRequiredRoleForPath(
  pathname: string,
): AccountRole | null {
  if (!isProtectedPath(pathname)) {
    return null;
  }

  if (pathname.startsWith("/admin")) {
    return "admin";
  }

  if (pathname.startsWith("/studio")) {
    return "writer";
  }

  return "reader";
}