import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/register", "/tv", "/manifest.webmanifest", "/icon.svg", "/apple-icon.png", "/api/health"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  const hasSession = request.cookies.has("pc_session");
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:png|svg|jpg|webp|ico|woff2?)$).*)"],
};
