import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Attachment Admin", charset="UTF-8"',
    },
  });
}

export function middleware(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return new NextResponse("ADMIN_PASSWORD is not configured.", { status: 500 });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Basic ")) {
    return unauthorized();
  }

  const encoded = authorization.replace("Basic ", "");
  let decoded = "";

  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized();
  }

  const separator = decoded.indexOf(":");
  if (separator < 0) {
    return unauthorized();
  }

  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);

  if (username !== "admin" || password !== adminPassword) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

