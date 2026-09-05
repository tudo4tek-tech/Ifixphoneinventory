import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { deviceLineId, name } = body;

  if (!deviceLineId || typeof deviceLineId !== "string") {
    return NextResponse.json({ error: "deviceLineId is required" }, { status: 400 });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const line = await prisma.deviceLine.findUnique({ where: { id: deviceLineId } });
  if (!line) {
    return NextResponse.json({ error: "deviceLineId does not exist" }, { status: 400 });
  }

  const trimmed = name.trim();
  const slug = slugify(trimmed);
  const existing = await prisma.model.findUnique({
    where: { deviceLineId_slug: { deviceLineId, slug } },
  });
  if (existing) {
    return NextResponse.json({ error: `"${trimmed}" already exists` }, { status: 409 });
  }

  const model = await prisma.model.create({
    data: { name: trimmed, slug, deviceLineId },
  });

  return NextResponse.json(model, { status: 201 });
}
