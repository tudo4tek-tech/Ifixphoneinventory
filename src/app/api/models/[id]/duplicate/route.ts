import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { uniqueCopyName } from "@/lib/uniqueName";

// Copies the model's part-category structure (names only, useful for
// quickly scaffolding a similar new phone model) but not its inventory
// items -- stock counts/prices are specific to the original model and
// shouldn't be silently copied onto a new one.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const model = await prisma.model.findUnique({
    where: { id },
    include: { categories: { select: { name: true, order: true } } },
  });
  if (!model) {
    return NextResponse.json({ error: "model not found" }, { status: 404 });
  }

  const name = await uniqueCopyName(model.name, async (candidate) => {
    const found = await prisma.model.findUnique({
      where: { deviceLineId_slug: { deviceLineId: model.deviceLineId, slug: slugify(candidate) } },
    });
    return !!found;
  });

  const created = await prisma.model.create({
    data: {
      name,
      slug: slugify(name),
      deviceLineId: model.deviceLineId,
      categories: {
        create: model.categories.map((c) => ({ name: c.name, order: c.order })),
      },
    },
    include: { _count: { select: { categories: true } } },
  });

  return NextResponse.json(created, { status: 201 });
}
