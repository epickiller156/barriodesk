import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { sales, saleItems, products, customers, fiadoRecords, stockMovements } from "@/db/schema";
import { eq, and, gte, lte, desc, sum, count } from "drizzle-orm";
import { z } from "zod";
import { sendPushToStore, pushTemplates } from "@/lib/push";

const saleItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  costPrice: z.number().positive(),
  subtotal: z.number().positive(),
  discount: z.number().default(0),
});

const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1),
  subtotal: z.number(),
  discountAmount: z.number().default(0),
  taxAmount: z.number().default(0),
  total: z.number().positive(),
  paymentMethod: z.enum(["CASH", "MERCADOPAGO_QR", "TRANSFER", "DEBIT_CARD", "CREDIT_CARD", "FIADO", "MIXED"]),
  paymentStatus: z.enum(["PAID", "PENDING", "PARTIAL", "CANCELLED"]).default("PAID"),
  customerId: z.string().optional(),
  isFiado: z.boolean().default(false),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const conditions = [eq(sales.storeId, session.storeId)];
    if (dateFrom) conditions.push(gte(sales.createdAt, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(sales.createdAt, new Date(dateTo)));

    const result = await db.select({
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
    }).from(sales)
      .where(and(...conditions))
      .orderBy(desc(sales.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ sales: result });
  } catch (error) {
    console.error("Sales GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await req.json();
    const parsed = saleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Check stock availability
    for (const item of data.items) {
      const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (product && product.stock !== null) {
        const qty = Math.ceil(item.quantity);
        if (product.stock < qty) {
          // Check if negative stock is allowed (for simplicity, allow it)
        }
      }
    }

    const [sale] = await db.insert(sales).values({
      storeId: session.storeId,
      customerId: data.customerId || null,
      subtotal: data.subtotal.toString(),
      discountAmount: data.discountAmount.toString(),
      taxAmount: data.taxAmount.toString(),
      total: data.total.toString(),
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus,
      isFiado: data.isFiado,
      notes: data.notes,
      cashierId: session.userId,
    }).returning();

    // Insert sale items and update stock
    for (const item of data.items) {
      await db.insert(saleItems).values({
        saleId: sale.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        costPrice: item.costPrice.toString(),
        subtotal: item.subtotal.toString(),
        discount: item.discount.toString(),
      });

      // Update stock
      const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (product) {
        const qty = Math.ceil(item.quantity);
        const newStock = product.stock - qty;
        await db.update(products).set({ stock: newStock, updatedAt: new Date() })
          .where(eq(products.id, item.productId));

        await db.insert(stockMovements).values({
          productId: item.productId,
          type: "SALE",
          quantity: -qty,
          previousStock: product.stock,
          newStock,
          saleId: sale.id,
          reason: `Venta #${sale.saleNumber}`,
        });
      }
    }

    // Create fiado record if applicable
    if (data.isFiado && data.customerId) {
      await db.insert(fiadoRecords).values({
        customerId: data.customerId,
        saleId: sale.id,
        amount: data.total.toString(),
        paidAmount: "0",
        remainingAmount: data.total.toString(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: "PENDING",
      });

      // Update customer debt
      const [customer] = await db.select().from(customers).where(eq(customers.id, data.customerId)).limit(1);
      if (customer) {
        const newDebt = parseFloat(customer.totalDebt) + data.total;
        const riskLevel = newDebt > 10000 ? "RED" : newDebt > 3000 ? "YELLOW" : "GREEN";
        await db.update(customers).set({
          totalDebt: newDebt.toString(),
          riskLevel: riskLevel as "RED" | "YELLOW" | "GREEN",
          updatedAt: new Date(),
        }).where(eq(customers.id, data.customerId));
      }
    }

    // Enviar notificación push de nueva venta
    try {
      const methodLabels: Record<string, string> = {
        CASH: "Efectivo",
        MERCADOPAGO_QR: "MercadoPago",
        TRANSFER: "Transferencia",
        DEBIT_CARD: "Débito",
        CREDIT_CARD: "Crédito",
        FIADO: "Fiado",
        MIXED: "Mixto",
      };
      await sendPushToStore(session.storeId, pushTemplates.newSale(
        `$${data.total.toFixed(2)}`,
        methodLabels[data.paymentMethod] || data.paymentMethod
      ));
    } catch (pushError) {
      console.error("Error enviando push:", pushError);
    }

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    console.error("Sales POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
