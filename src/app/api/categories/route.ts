import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { modelId, name } = body;

  if (!modelId || typeof modelId !== "string") {
    return NextResponse.json({ error: "modelId is required" }, { status: 400 });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const model = await prisma.model.findUnique({ where: { id: modelId } });
  if (!model) {
    return NextResponse.json({ error: "modelId does not exist" }, { status: 400 });
  }

  const existing = await prisma.partCategory.findUnique({
    where: { modelId_name: { modelId, name: name.trim() } },
  });
  if (existing) {
    return NextResponse.json(existing, { status: 200 });
  }

  const category = await prisma.partCategory.create({
    data: { modelId, name: name.trim(), order: 50 },
  });

  return NextResponse.json(category, { status: 201 });
}
