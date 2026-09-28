import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { sales, saleItems, customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id: saleId } = await params;

    const [sale] = await db.select({
      id: sales.id,
      saleNumber: sales.saleNumber,
      total: sales.total,
      subtotal: sales.subtotal,
      discountAmount: sales.discountAmount,
      paymentMethod: sales.paymentMethod,
      paymentStatus: sales.paymentStatus,
      isFiado: sales.isFiado,
      customerId: sales.customerId,
      notes: sales.notes,
      createdAt: sales.createdAt,
    }).from(sales).where(
      and(eq(sales.id, saleId), eq(sales.storeId, session.storeId))
    ).limit(1);

    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    // Get sale items
    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));

    // Get customer if exists
    let customer = null;
    if (sale.customerId) {
      const [c] = await db.select({
        id: customers.id,
        name: customers.name,
        nickname: customers.nickname,
        phone: customers.phone,
      }).from(customers).where(eq(customers.id, sale.customerId)).limit(1);
      customer = c || null;
    }

    return NextResponse.json({ sale, items, customer });
  } catch (error) {
    console.error("Sale GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
