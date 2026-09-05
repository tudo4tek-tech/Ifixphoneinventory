import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uniqueCopyName } from "@/lib/uniqueName";

// Copies the category (name + order) into the same model, empty of items.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const category = await prisma.partCategory.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: "category not found" }, { status: 404 });
  }

  const name = await uniqueCopyName(category.name, async (candidate) => {
    const found = await prisma.partCategory.findUnique({
      where: { modelId_name: { modelId: category.modelId, name: candidate } },
    });
    return !!found;
  });

  const created = await prisma.partCategory.create({
    data: { name, order: category.order, modelId: category.modelId },
  });

  return NextResponse.json(created, { status: 201 });
}
