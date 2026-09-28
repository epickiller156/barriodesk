import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { purchases, purchaseItems, products, stockMovements } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const purchaseItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  unitCost: z.number().positive(),
  updateCost: z.boolean().default(false),
});

const purchaseSchema = z.object({
  supplierId: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1),
  subtotal: z.number(),
  taxAmount: z.number().default(0),
  total: z.number(),
  paymentMethod: z.enum(["CASH", "MERCADOPAGO_QR", "TRANSFER", "DEBIT_CARD", "CREDIT_CARD", "FIADO", "MIXED"]),
  paymentStatus: z.enum(["PAID", "PENDING", "PARTIAL", "CANCELLED"]).default("PAID"),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
  purchasedAt: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const result = await db.select().from(purchases)
      .where(eq(purchases.storeId, session.storeId))
      .orderBy(desc(purchases.createdAt))
      .limit(50);

    return NextResponse.json({ purchases: result });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await req.json();
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;

    const [purchase] = await db.insert(purchases).values({
      storeId: session.storeId,
      supplierId: data.supplierId || null,
      subtotal: data.subtotal.toString(),
      taxAmount: data.taxAmount.toString(),
      total: data.total.toString(),
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus,
      invoiceNumber: data.invoiceNumber,
      notes: data.notes,
      purchasedAt: data.purchasedAt ? new Date(data.purchasedAt) : new Date(),
    }).returning();

    for (const item of data.items) {
      await db.insert(purchaseItems).values({
        purchaseId: purchase.id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost.toString(),
        subtotal: (item.quantity * item.unitCost).toFixed(2),
      });

      // Update stock
      const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (product) {
        const newStock = product.stock + item.quantity;
        const updates: Record<string, unknown> = { stock: newStock, updatedAt: new Date() };
        if (item.updateCost) {
          updates.costPrice = item.unitCost.toString();
        }
        await db.update(products).set(updates).where(eq(products.id, item.productId));

        await db.insert(stockMovements).values({
          productId: item.productId,
          type: "PURCHASE",
          quantity: item.quantity,
          previousStock: product.stock,
          newStock,
          purchaseId: purchase.id,
          reason: `Compra #${purchase.purchaseNumber}`,
        });
      }
    }

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    console.error("Purchase error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
