import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { products, priceHistory } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  productIds: z.array(z.string()),
  type: z.enum(["percentage", "fixed"]),
  value: z.number(),
  applyTo: z.enum(["salePrice", "costPrice", "both"]),
  roundTo: z.number().default(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

    const { productIds, type, value, applyTo, roundTo } = parsed.data;

    const existingProducts = await db.select().from(products)
      .where(and(eq(products.storeId, session.storeId), inArray(products.id, productIds)));

    const updated = [];
    for (const product of existingProducts) {
      const applyUpdate = (oldPrice: string) => {
        let newPrice = parseFloat(oldPrice);
        if (type === "percentage") {
          newPrice = newPrice * (1 + value / 100);
        } else {
          newPrice = newPrice + value;
        }
        if (roundTo > 1) {
          newPrice = Math.round(newPrice / roundTo) * roundTo;
        }
        return Math.max(0, newPrice).toFixed(2);
      };

      const updates: Record<string, string> = {};
      if (applyTo === "salePrice" || applyTo === "both") {
        const newSalePrice = applyUpdate(product.salePrice);
        updates.salePrice = newSalePrice;
        await db.insert(priceHistory).values({
          productId: product.id,
          oldPrice: product.salePrice,
          newPrice: newSalePrice,
          changedById: session.userId,
          reason: `Actualización masiva: ${type === "percentage" ? `+${value}%` : `+$${value}`}`,
        });
      }
      if (applyTo === "costPrice" || applyTo === "both") {
        updates.costPrice = applyUpdate(product.costPrice);
      }

      const [updatedProduct] = await db.update(products).set({ ...updates, updatedAt: new Date() })
        .where(eq(products.id, product.id)).returning();
      updated.push(updatedProduct);
    }

    return NextResponse.json({ updated: updated.length, products: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
