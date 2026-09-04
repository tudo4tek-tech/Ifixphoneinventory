import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, partCategoryId } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!partCategoryId || typeof partCategoryId !== "string") {
    return NextResponse.json({ error: "partCategoryId is required" }, { status: 400 });
  }

  const category = await prisma.partCategory.findUnique({ where: { id: partCategoryId } });
  if (!category) {
    return NextResponse.json({ error: "partCategoryId does not exist" }, { status: 400 });
  }

  const item = await prisma.inventoryItem.create({
    data: {
      name: name.trim(),
      partCategoryId,
      reference: body.reference ?? null,
      supplier: body.supplier ?? null,
      notes: body.notes ?? null,
      costPrice: body.costPrice ?? null,
      sellPrice: body.sellPrice ?? null,
      quantity: Number.isFinite(body.quantity) ? Math.round(body.quantity) : 0,
      lowStockThreshold: Number.isFinite(body.lowStockThreshold) ? Math.round(body.lowStockThreshold) : 2,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
