import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { orders, products, stockMovements } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateOrderSchema = z.object({
  status: z.enum(["NEW", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id: orderId } = await params;
    const body = await req.json();
    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const newStatus = parsed.data.status;

    // Get order
    const [order] = await db.select().from(orders).where(
      and(eq(orders.id, orderId), eq(orders.storeId, session.storeId))
    ).limit(1);

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    // If delivering (READY -> DELIVERED), discount stock
    if (newStatus === "DELIVERED" && order.status === "READY") {
      const items = order.items as Array<{ productId: string; productName: string; quantity: number; unitPrice: number }>;
      for (const item of items) {
        const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
        if (product) {
          const qty = Math.ceil(item.quantity);
          const newStock = Math.max(0, product.stock - qty);
          await db.update(products).set({ stock: newStock, updatedAt: new Date() })
            .where(eq(products.id, item.productId));

          await db.insert(stockMovements).values({
            productId: item.productId,
            type: "SALE",
            quantity: -qty,
            previousStock: product.stock,
            newStock,
            reason: `Pedido online entregado #${order.id.slice(0, 8)}`,
          });
        }
      }
    }

    // If cancelling before delivery (NEW/CONFIRMED/PREPARING/READY -> CANCELLED), no stock to restore
    // because stock was only discounted on delivery

    // Update order status
    const [updatedOrder] = await db.update(orders).set({
      status: newStatus,
      updatedAt: new Date(),
    }).where(eq(orders.id, orderId)).returning();

    return NextResponse.json({
      order: updatedOrder,
      message: newStatus === "CANCELLED" ? "Pedido cancelado. Stock revertido." : `Pedido actualizado a ${newStatus}`,
    });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
