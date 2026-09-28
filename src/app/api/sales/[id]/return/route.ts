import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { sales, saleItems, products, customers, fiadoRecords, stockMovements } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const returnSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
  })).min(1),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id: saleId } = await params;
    const body = await req.json();
    const parsed = returnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    // Get the sale
    const [sale] = await db.select().from(sales).where(
      and(eq(sales.id, saleId), eq(sales.storeId, session.storeId))
    ).limit(1);

    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    // Get sale items
    const saleItemsList = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));

    // Validate return quantities
    for (const item of parsed.data.items) {
      const saleItem = saleItemsList.find(si => si.productId === item.productId);
      if (!saleItem) {
        return NextResponse.json({ error: `El producto ${item.productId} no está en esta venta` }, { status: 400 });
      }
      const currentQty = parseFloat(saleItem.quantity);
      if (item.quantity > currentQty) {
        return NextResponse.json({ error: `No podés devolver más de ${currentQty} unidades de ${saleItem.productName}` }, { status: 400 });
      }
    }

    // Process returns
    let totalReturned = 0;
    for (const item of parsed.data.items) {
      const saleItem = saleItemsList.find(si => si.productId === item.productId)!;
      const returnQty = Math.ceil(item.quantity);
      const unitPrice = parseFloat(saleItem.unitPrice);
      const returnAmount = unitPrice * returnQty;
      totalReturned += returnAmount;

      // Update stock
      const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (product) {
        const newStock = product.stock + returnQty;
        await db.update(products).set({ stock: newStock, updatedAt: new Date() })
          .where(eq(products.id, item.productId));

        await db.insert(stockMovements).values({
          productId: item.productId,
          type: "RETURN",
          quantity: returnQty,
          previousStock: product.stock,
          newStock,
          saleId: saleId,
          reason: parsed.data.reason || `Devolución de venta #${sale.saleNumber}`,
        });
      }
    }

    // Update fiado record if applicable
    if (sale.isFiado && sale.customerId) {
      const [fiadoRecord] = await db.select().from(fiadoRecords).where(eq(fiadoRecords.saleId, saleId)).limit(1);
      if (fiadoRecord) {
        const newRemaining = parseFloat(fiadoRecord.remainingAmount) - totalReturned;
        const newPaid = parseFloat(fiadoRecord.paidAmount) + totalReturned;
        const newStatus = newRemaining <= 0 ? "PAID" : "PARTIAL";

        await db.update(fiadoRecords).set({
          remainingAmount: Math.max(0, newRemaining).toString(),
          paidAmount: newPaid.toString(),
          status: newStatus as "PAID" | "PARTIAL",
          updatedAt: new Date(),
        }).where(eq(fiadoRecords.id, fiadoRecord.id));

        // Update customer debt
        const [customer] = await db.select().from(customers).where(eq(customers.id, sale.customerId)).limit(1);
        if (customer) {
          const newDebt = parseFloat(customer.totalDebt) - totalReturned;
          const riskLevel = newDebt > 10000 ? "RED" : newDebt > 3000 ? "YELLOW" : "GREEN";
          await db.update(customers).set({
            totalDebt: Math.max(0, newDebt).toString(),
            riskLevel: riskLevel as "RED" | "YELLOW" | "GREEN",
            updatedAt: new Date(),
          }).where(eq(customers.id, customer.id));
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Devolución procesada. Se devolvieron $${totalReturned.toFixed(2)} en productos.`,
      totalReturned,
    });
  } catch (error) {
    console.error("Return error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
