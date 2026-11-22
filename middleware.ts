import { NextResponse, type NextRequest } from "next/server";

const ADMIN_COOKIE_NAME = "lmdpl_admin_session";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (request.nextUrl.pathname.startsWith("/admin") && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("next", "/admin");
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request });
}

export const config = { matcher: ["/admin/:path*"] };