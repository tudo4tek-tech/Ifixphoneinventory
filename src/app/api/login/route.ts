import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, expectedAuthToken, totpRequired, verifyTotp } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password, code } = await req.json();
  const expected = await expectedAuthToken();

  if (!expected || typeof password !== "string" || password !== process.env.SITE_PASSWORD) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  if (totpRequired()) {
    const ok = await verifyTotp(typeof code === "string" ? code : "");
    if (!ok) {
      return NextResponse.json({ error: "Incorrect authenticator code" }, { status: 401 });
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, expected, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
