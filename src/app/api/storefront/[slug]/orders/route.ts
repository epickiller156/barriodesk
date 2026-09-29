import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stores, products, orders, stockMovements, storeSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { sendPushToStore, pushTemplates } from "@/lib/push";

// Helper para convertir strings vacíos a null
const emptyToNull = z.union([z.string(), z.null()]).optional().transform((val) => val === "" ? null : val);

const orderSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  orderType: z.enum(["pickup", "delivery"]).default("pickup"),
  deliveryAddress: emptyToNull,
  paymentMethod: z.enum(["CASH", "MERCADOPAGO_QR", "TRANSFER", "DEBIT_CARD", "CREDIT_CARD", "FIADO"]),
  notes: emptyToNull,
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
    let deliveryCost = 0;
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

    // Add delivery cost if applicable
    if (parsed.data.orderType === "delivery") {
      const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.storeId, store.id)).limit(1);
      if (settings && settings.acceptDelivery && settings.deliveryCost) {
        deliveryCost = parseFloat(settings.deliveryCost);
        total += deliveryCost;
      }
    }

    // Create order (NO descontar stock aquí - se descuenta cuando se entrega)
    const [order] = await db.insert(orders).values({
      storeId: store.id,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      orderType: parsed.data.orderType,
      deliveryAddress: parsed.data.deliveryAddress || null,
      deliveryCost: deliveryCost.toString(),
      paymentMethod: parsed.data.paymentMethod,
      total: total.toString(),
      status: "NEW",
      notes: parsed.data.notes || null,
      items: itemsWithStock,
    }).returning();

    // Enviar notificación push de nuevo pedido
    try {
      await sendPushToStore(store.id, pushTemplates.newOrder(
        parsed.data.customerName,
        `$${total.toFixed(2)}`
      ));
    } catch (pushError) {
      console.error("Error enviando push:", pushError);
    }

    return NextResponse.json({ order, message: "Pedido creado exitosamente" }, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
