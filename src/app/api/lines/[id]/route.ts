import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name } = await req.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const line = await prisma.deviceLine.findUnique({ where: { id } });
  if (!line) {
    return NextResponse.json({ error: "line not found" }, { status: 404 });
  }

  const trimmed = name.trim();
  const slug = slugify(trimmed);
  if (slug !== line.slug) {
    const collision = await prisma.deviceLine.findUnique({
      where: { brandId_slug: { brandId: line.brandId, slug } },
    });
    if (collision) {
      return NextResponse.json({ error: `"${trimmed}" already exists` }, { status: 409 });
    }
  }

  const updated = await prisma.deviceLine.update({
    where: { id },
    data: { name: trimmed, slug },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // onDelete: Cascade removes its models -> categories -> items too.
    await prisma.deviceLine.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "line not found" }, { status: 404 });
  }
}
