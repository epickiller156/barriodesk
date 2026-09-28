import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { sales, saleItems, products } from "@/db/schema";
import { eq, and, gte, lte, sum, count, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dateTo = searchParams.get("dateTo") || new Date().toISOString();

    const conditions = [
      eq(sales.storeId, session.storeId),
      gte(sales.createdAt, new Date(dateFrom)),
      lte(sales.createdAt, new Date(dateTo)),
    ];

    // Total summary
    const [summary] = await db.select({
      total: sum(sales.total),
      count: count(),
      discount: sum(sales.discountAmount),
    }).from(sales).where(and(...conditions));

    // By payment method
    const byMethod = await db.select({
      paymentMethod: sales.paymentMethod,
      total: sum(sales.total),
      count: count(),
    }).from(sales).where(and(...conditions)).groupBy(sales.paymentMethod);

    // Daily breakdown
    const allSales = await db.select({
      total: sales.total,
      createdAt: sales.createdAt,
    }).from(sales).where(and(...conditions)).orderBy(sales.createdAt);

    const dailyMap: Record<string, { total: number; count: number }> = {};
    for (const s of allSales) {
      const day = s.createdAt.toISOString().split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { total: 0, count: 0 };
      dailyMap[day].total += parseFloat(s.total);
      dailyMap[day].count++;
    }
    const daily = Object.entries(dailyMap).map(([date, data]) => ({ date, ...data }));

    // Top products
    const topProducts = await db.select({
      productId: saleItems.productId,
      productName: saleItems.productName,
      totalQuantity: sum(saleItems.quantity),
      totalRevenue: sum(saleItems.subtotal),
      count: count(),
    }).from(saleItems)
      .leftJoin(sales, eq(saleItems.saleId, sales.id))
      .where(and(eq(sales.storeId, session.storeId), gte(sales.createdAt, new Date(dateFrom)), lte(sales.createdAt, new Date(dateTo))))
      .groupBy(saleItems.productId, saleItems.productName)
      .orderBy(desc(sum(saleItems.subtotal)))
      .limit(10);

    return NextResponse.json({
      summary: {
        total: parseFloat(summary.total || "0"),
        count: summary.count,
        discount: parseFloat(summary.discount || "0"),
        avgTicket: summary.count > 0 ? parseFloat(summary.total || "0") / summary.count : 0,
      },
      byMethod: byMethod.map(b => ({ method: b.paymentMethod, total: parseFloat(b.total || "0"), count: b.count })),
      daily,
      topProducts: topProducts.map(p => ({
        productId: p.productId,
        productName: p.productName,
        totalQuantity: parseFloat(p.totalQuantity || "0"),
        totalRevenue: parseFloat(p.totalRevenue || "0"),
        count: p.count,
      })),
    });
  } catch (error) {
    console.error("Reports sales error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
