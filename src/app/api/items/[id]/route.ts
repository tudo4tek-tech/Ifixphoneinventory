import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EDITABLE_FIELDS = [
  "name",
  "reference",
  "supplier",
  "notes",
  "costPrice",
  "sellPrice",
  "quantity",
  "lowStockThreshold",
] as const;

const INTEGER_FIELDS = new Set(["quantity", "lowStockThreshold"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      const value = body[field];
      data[field] = INTEGER_FIELDS.has(field) && typeof value === "number"
        ? Math.round(value)
        : value;
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no editable fields provided" }, { status: 400 });
  }

  try {
    const item = await prisma.inventoryItem.update({ where: { id }, data });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "item not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.inventoryItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "item not found" }, { status: 404 });
  }
}
