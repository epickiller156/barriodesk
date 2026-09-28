import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { cashClosings, sales } from "@/db/schema";
import { eq, and, gte, lte, sum, count, desc } from "drizzle-orm";
import { z } from "zod";

const closingSchema = z.object({
  openedAt: z.string(),
  openingCash: z.number(),
  actualCash: z.number(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const closings = await db.select().from(cashClosings)
      .where(eq(cashClosings.storeId, session.storeId))
      .orderBy(desc(cashClosings.createdAt))
      .limit(30);

    // Current day summary
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const todaySalesByMethod = await db.select({
      paymentMethod: sales.paymentMethod,
      total: sum(sales.total),
      count: count(),
    }).from(sales)
      .where(and(
        eq(sales.storeId, session.storeId),
        gte(sales.createdAt, todayStart),
        lte(sales.createdAt, todayEnd),
      ))
      .groupBy(sales.paymentMethod);

    return NextResponse.json({ closings, todaySalesByMethod });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await req.json();
    const parsed = closingSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

    const { openedAt, openingCash, actualCash, notes } = parsed.data;
    const closedAt = new Date();
    const openedAtDate = new Date(openedAt);

    // Calculate sales totals for the period
    const salesByMethod = await db.select({
      paymentMethod: sales.paymentMethod,
      total: sum(sales.total),
      count: count(),
    }).from(sales)
      .where(and(
        eq(sales.storeId, session.storeId),
        gte(sales.createdAt, openedAtDate),
        lte(sales.createdAt, closedAt),
      ))
      .groupBy(sales.paymentMethod);

    const methodTotals: Record<string, number> = {};
    let totalTransactions = 0;
    for (const s of salesByMethod) {
      methodTotals[s.paymentMethod] = parseFloat(s.total || "0");
      totalTransactions += s.count;
    }

    const totalCashSales = methodTotals["CASH"] || 0;
    const totalMpSales = methodTotals["MERCADOPAGO_QR"] || 0;
    const totalTransferSales = methodTotals["TRANSFER"] || 0;
    const totalCardSales = (methodTotals["DEBIT_CARD"] || 0) + (methodTotals["CREDIT_CARD"] || 0);
    const totalFiadoSales = methodTotals["FIADO"] || 0;
    const totalSales = Object.values(methodTotals).reduce((a, b) => a + b, 0);
    const theoreticalCash = openingCash + totalCashSales;
    const difference = actualCash - theoreticalCash;

    const [closing] = await db.insert(cashClosings).values({
      storeId: session.storeId,
      openedAt: openedAtDate,
      closedAt,
      openingCash: openingCash.toString(),
      totalCashSales: totalCashSales.toFixed(2),
      totalMpSales: totalMpSales.toFixed(2),
      totalTransferSales: totalTransferSales.toFixed(2),
      totalCardSales: totalCardSales.toFixed(2),
      totalFiadoSales: totalFiadoSales.toFixed(2),
      totalSales: totalSales.toFixed(2),
      theoreticalCash: theoreticalCash.toFixed(2),
      actualCash: actualCash.toFixed(2),
      difference: difference.toFixed(2),
      totalTransactions,
      notes,
      closedById: session.userId,
    }).returning();

    return NextResponse.json({ closing }, { status: 201 });
  } catch (error) {
    console.error("Cash closing error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
