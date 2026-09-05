import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brandId, name } = body;

  if (!brandId || typeof brandId !== "string") {
    return NextResponse.json({ error: "brandId is required" }, { status: 400 });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) {
    return NextResponse.json({ error: "brandId does not exist" }, { status: 400 });
  }

  const trimmed = name.trim();
  const slug = slugify(trimmed);
  const existing = await prisma.deviceLine.findUnique({
    where: { brandId_slug: { brandId, slug } },
  });
  if (existing) {
    return NextResponse.json({ error: `"${trimmed}" already exists` }, { status: 409 });
  }

  const line = await prisma.deviceLine.create({
    data: { name: trimmed, slug, brandId },
  });

  return NextResponse.json(line, { status: 201 });
}
