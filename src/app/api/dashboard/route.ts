import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { sales, saleItems, products, customers, fiadoRecords, notifications } from "@/db/schema";
import { eq, and, gte, lt, lte, sum, count, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const storeId = session.storeId;
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate()-1);
    const yesterdayEnd = new Date(todayEnd); yesterdayEnd.setDate(yesterdayEnd.getDate()-1);
    const weekAgo = new Date(todayStart); weekAgo.setDate(weekAgo.getDate()-6);

    // Today's sales
    const todaySales = await db.select({
      total: sum(sales.total),
      count: count(),
    }).from(sales).where(
      and(eq(sales.storeId, storeId), gte(sales.createdAt, todayStart), lte(sales.createdAt, todayEnd))
    );

    // Yesterday's sales
    const yesterdaySales = await db.select({
      total: sum(sales.total),
      count: count(),
    }).from(sales).where(
      and(eq(sales.storeId, storeId), gte(sales.createdAt, yesterdayStart), lte(sales.createdAt, yesterdayEnd))
    );

    // Today's fiado sales
    const todayFiado = await db.select({
      total: sum(sales.total),
      count: count(),
    }).from(sales).where(
      and(eq(sales.storeId, storeId), eq(sales.isFiado, true), gte(sales.createdAt, todayStart), lte(sales.createdAt, todayEnd))
    );

    // Recent sales (last 5)
    const recentSales = await db.select({
      id: sales.id,
      total: sales.total,
      paymentMethod: sales.paymentMethod,
      createdAt: sales.createdAt,
      customerId: sales.customerId,
    }).from(sales).where(eq(sales.storeId, storeId)).orderBy(desc(sales.createdAt)).limit(5);

    // Sales by payment method today
    const allTodaySales = await db.select({
      paymentMethod: sales.paymentMethod,
      total: sum(sales.total),
      count: count(),
    }).from(sales).where(
      and(eq(sales.storeId, storeId), gte(sales.createdAt, todayStart), lte(sales.createdAt, todayEnd))
    ).groupBy(sales.paymentMethod);

    // Low stock products
    const lowStockProducts = await db.select({
      id: products.id,
      name: products.name,
      stock: products.stock,
      minStock: products.minStock,
    }).from(products).where(
      and(eq(products.storeId, storeId), eq(products.isActive, true), lte(products.stock, products.minStock))
    ).limit(5);

    // Expiring products (next 15 days)
    const expirationDate = new Date(); expirationDate.setDate(expirationDate.getDate() + 15);
    const expiringProducts = await db.select({
      id: products.id,
      name: products.name,
      stock: products.stock,
      expirationDate: products.expirationDate,
    }).from(products).where(
      and(eq(products.storeId, storeId), eq(products.isActive, true), lte(products.expirationDate, expirationDate))
    ).orderBy(products.expirationDate).limit(5);

    // Total fiado outstanding
    const totalFiado = await db.select({
      total: sum(fiadoRecords.remainingAmount),
      count: count(),
    }).from(fiadoRecords).where(
      and(
        eq(fiadoRecords.status, "PENDING")
      )
    );

    // Weekly sales (last 7 days)
    const weeklySalesData = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStart); dayStart.setDate(dayStart.getDate()-i);
      const dayEnd = new Date(todayEnd); dayEnd.setDate(dayEnd.getDate()-i);
      const [daySales] = await db.select({ total: sum(sales.total), count: count() })
        .from(sales).where(and(eq(sales.storeId, storeId), gte(sales.createdAt, dayStart), lte(sales.createdAt, dayEnd)));
      weeklySalesData.push({
        date: dayStart.toISOString().split('T')[0],
        total: parseFloat(daySales.total || "0"),
        count: daySales.count,
      });
    }

    // Unread notifications count
    const [unreadCount] = await db.select({ count: count() }).from(notifications)
      .where(and(eq(notifications.storeId, storeId), eq(notifications.isRead, false)));

    // Customer names for recent sales
    const customerIds = recentSales.filter(s => s.customerId).map(s => s.customerId!);
    let customerMap: Record<string, string> = {};
    if (customerIds.length > 0) {
      const customersList = await db.select({ id: customers.id, name: customers.name, nickname: customers.nickname })
        .from(customers).where(eq(customers.storeId, storeId));
      customerMap = Object.fromEntries(customersList.map(c => [c.id, c.nickname || c.name]));
    }

    const enrichedRecentSales = recentSales.map(s => ({
      ...s,
      customerName: s.customerId ? (customerMap[s.customerId] || "Cliente") : "Anónimo",
    }));

    return NextResponse.json({
      todaySales: {
        total: parseFloat(todaySales[0]?.total || "0"),
        count: todaySales[0]?.count || 0,
      },
      yesterdaySales: {
        total: parseFloat(yesterdaySales[0]?.total || "0"),
        count: yesterdaySales[0]?.count || 0,
      },
      todayFiado: {
        total: parseFloat(todayFiado[0]?.total || "0"),
        count: todayFiado[0]?.count || 0,
      },
      salesByPaymentMethod: allTodaySales.map(s => ({
        method: s.paymentMethod,
        total: parseFloat(s.total || "0"),
        count: s.count,
      })),
      recentSales: enrichedRecentSales,
      lowStockProducts,
      expiringProducts,
      totalFiado: {
        total: parseFloat(totalFiado[0]?.total || "0"),
        count: totalFiado[0]?.count || 0,
      },
      weeklySales: weeklySalesData,
      unreadNotifications: unreadCount.count,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
