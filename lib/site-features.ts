export const EDITORIAL_PAGE_PATHS = ["/stack", "/radar", "/insights"] as const;

export function areEditorialPagesEnabled(
  environment = process.env.NODE_ENV,
): boolean {
  return environment !== "production";
}

export function isEditorialPagePath(pathname: string): boolean {
  return EDITORIAL_PAGE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}