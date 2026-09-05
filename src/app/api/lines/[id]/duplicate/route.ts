import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { uniqueCopyName } from "@/lib/uniqueName";

// Shallow duplicate: a new, empty line (no models copied). Deep-copying a
// line's full model/category tree could mean duplicating hundreds of
// models (e.g. Galaxy A), which isn't a realistic "quick copy" case --
// duplicating structure is most useful one level down, at the model.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const line = await prisma.deviceLine.findUnique({ where: { id } });
  if (!line) {
    return NextResponse.json({ error: "line not found" }, { status: 404 });
  }

  const name = await uniqueCopyName(line.name, async (candidate) => {
    const found = await prisma.deviceLine.findUnique({
      where: { brandId_slug: { brandId: line.brandId, slug: slugify(candidate) } },
    });
    return !!found;
  });

  const created = await prisma.deviceLine.create({
    data: { name, slug: slugify(name), brandId: line.brandId },
  });

  return NextResponse.json(created, { status: 201 });
}
