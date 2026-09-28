import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stores, products, orders, stockMovements } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const orderSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  orderType: z.enum(["pickup", "delivery"]).default("pickup"),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.enum(["CASH", "MERCADOPAGO_QR", "TRANSFER", "DEBIT_CARD", "CREDIT_CARD", "FIADO"]),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })).min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    // Find store by slug
    const [store] = await db.select().from(stores).where(eq(stores.slug, slug)).limit(1);
    if (!store) {
      return NextResponse.json({ error: "Kiosco no encontrado" }, { status: 404 });
    }
    if (!store.isStorefrontActive) {
      return NextResponse.json({ error: "Este kiosco no tiene catálogo activo" }, { status: 403 });
    }

    // Validate stock and calculate total
    let total = 0;
    const itemsWithStock = [];
    for (const item of parsed.data.items) {
      const [product] = await db.select().from(products).where(
        and(eq(products.id, item.productId), eq(products.storeId, store.id))
      ).limit(1);

      if (!product) {
        return NextResponse.json({ error: `Producto no encontrado: ${item.productName}` }, { status: 404 });
      }

      const qty = Math.ceil(item.quantity);
      if (product.stock < qty) {
        return NextResponse.json({ error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}` }, { status: 400 });
      }

      total += item.unitPrice * qty;
      itemsWithStock.push({ ...item, quantity: qty });
    }

    // Create order
    const [order] = await db.insert(orders).values({
      storeId: store.id,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      orderType: parsed.data.orderType,
      deliveryAddress: parsed.data.deliveryAddress || null,
      paymentMethod: parsed.data.paymentMethod,
      total: total.toString(),
      status: "NEW",
      notes: parsed.data.notes || null,
      items: itemsWithStock,
    }).returning();

    return NextResponse.json({ order, message: "Pedido creado exitosamente" }, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
