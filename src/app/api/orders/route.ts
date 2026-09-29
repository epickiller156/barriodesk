import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { sendPushToStore, pushTemplates } from "@/lib/push";

const orderSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  orderType: z.enum(["pickup", "delivery"]).default("pickup"),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.enum(["CASH", "MERCADOPAGO_QR", "TRANSFER", "DEBIT_CARD", "CREDIT_CARD", "FIADO", "MIXED"]),
  total: z.number().positive(),
  status: z.enum(["NEW", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]).default("NEW"),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    subtotal: z.number().positive(),
  })).min(1),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");

    const conditions = [eq(orders.storeId, session.storeId)];
    if (status) conditions.push(eq(orders.status, status as "NEW" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED"));

    const result = await db.select().from(orders)
      .where(eq(orders.storeId, session.storeId))
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    return NextResponse.json({ orders: result });
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await req.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const [order] = await db.insert(orders).values({
      storeId: session.storeId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      orderType: data.orderType,
      deliveryAddress: data.deliveryAddress,
      paymentMethod: data.paymentMethod,
      total: data.total.toString(),
      status: data.status,
      notes: data.notes,
      items: data.items,
    }).returning();

    // Enviar notificación push de nuevo pedido
    try {
      await sendPushToStore(session.storeId, pushTemplates.newOrder(
        data.customerName,
        `$${data.total.toFixed(2)}`
      ));
    } catch (pushError) {
      console.error("Error enviando push:", pushError);
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("Orders POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
