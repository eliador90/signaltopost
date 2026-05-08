import { NextRequest, NextResponse } from "next/server";

const protectedDashboardPath = /^\/($|ideas(?:\/|$)|drafts(?:\/|$)|jobs(?:\/|$)|settings(?:\/|$))/;

export function middleware(request: NextRequest) {
  if (!protectedDashboardPath.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const dashboardSecret = process.env.DASHBOARD_SECRET?.trim();
  const developmentBypass = process.env.NODE_ENV !== "production" && !dashboardSecret;
  if (developmentBypass) {
    return NextResponse.next();
  }

  if (!dashboardSecret) {
    return new NextResponse("Dashboard auth is not configured.", { status: 503 });
  }

  if (isValidBasicAuthorization(request.headers.get("authorization"), dashboardSecret)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="SignalToPost Dashboard", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: ["/", "/ideas/:path*", "/drafts/:path*", "/jobs/:path*", "/settings/:path*"],
};

function isValidBasicAuthorization(authorization: string | null, expectedPassword: string) {
  if (!authorization?.startsWith("Basic ")) {
    return false;
  }

  let decoded = "";
  try {
    decoded = atob(authorization.slice("Basic ".length));
  } catch {
    return false;
  }

  const password = decoded.includes(":") ? decoded.slice(decoded.indexOf(":") + 1) : decoded;
  return password === expectedPassword;
}
