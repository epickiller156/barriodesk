import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { products, priceHistory } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// Helper para convertir strings vacíos a null
const emptyToNull = z.union([z.string(), z.null()]).optional().transform((val) => val === "" ? null : val);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: emptyToNull,
  barcode: emptyToNull,
  sku: emptyToNull,
  costPrice: z.string().optional(),
  salePrice: z.string().optional(),
  wholesalePrice: emptyToNull,
  stock: z.number().int().optional(),
  minStock: z.number().int().optional(),
  unit: z.string().optional(),
  allowFraction: z.boolean().optional(),
  isActive: z.boolean().optional(),
  categoryId: emptyToNull,
  supplierId: emptyToNull,
  expirationDate: emptyToNull,
  batchNumber: emptyToNull,
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { id } = await params;

    const [product] = await db.select().from(products)
      .where(and(eq(products.id, id), eq(products.storeId, session.storeId)))
      .limit(1);

    if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    return NextResponse.json({ product });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { id } = await params;

    const [existing] = await db.select().from(products)
      .where(and(eq(products.id, id), eq(products.storeId, session.storeId)))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Track price changes
    if (data.salePrice && data.salePrice !== existing.salePrice) {
      await db.insert(priceHistory).values({
        productId: id,
        oldPrice: existing.salePrice,
        newPrice: data.salePrice,
        changedById: session.userId,
        reason: "Actualización manual",
      });
    }

    const [updated] = await db.update(products).set({
      ...data,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : data.expirationDate === null ? null : existing.expirationDate,
      updatedAt: new Date(),
    }).where(eq(products.id, id)).returning();

    return NextResponse.json({ product: updated });
  } catch (error) {
    console.error("Products PUT error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { id } = await params;

    const [existing] = await db.select().from(products)
      .where(and(eq(products.id, id), eq(products.storeId, session.storeId)))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    await db.update(products).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.storeId, session.storeId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Products DELETE error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
