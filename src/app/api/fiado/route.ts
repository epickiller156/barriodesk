import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { fiadoRecords, fiadoPayments, customers, sales } from "@/db/schema";
import { eq, and, ne, sum, count, desc } from "drizzle-orm";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // Get all active fiado with customer info
    const result = await db.select({
      id: fiadoRecords.id,
      customerId: fiadoRecords.customerId,
      saleId: fiadoRecords.saleId,
      amount: fiadoRecords.amount,
      paidAmount: fiadoRecords.paidAmount,
      remainingAmount: fiadoRecords.remainingAmount,
      status: fiadoRecords.status,
      dueDate: fiadoRecords.dueDate,
      createdAt: fiadoRecords.createdAt,
      customerName: customers.name,
      customerNickname: customers.nickname,
      customerPhone: customers.phone,
      customerRiskLevel: customers.riskLevel,
      customerTotalDebt: customers.totalDebt,
    }).from(fiadoRecords)
      .leftJoin(customers, eq(fiadoRecords.customerId, customers.id))
      .leftJoin(sales, eq(fiadoRecords.saleId, sales.id))
      .where(and(
        eq(customers.storeId, session.storeId),
        ne(fiadoRecords.status, "PAID"),
        ne(fiadoRecords.status, "WRITTEN_OFF"),
      ))
      .orderBy(desc(fiadoRecords.createdAt));

    // Summary by customer
    const customerDebts = await db.select({
      customerId: fiadoRecords.customerId,
      totalDebt: sum(fiadoRecords.remainingAmount),
      count: count(),
      customerName: customers.name,
      customerNickname: customers.nickname,
      customerPhone: customers.phone,
      customerRiskLevel: customers.riskLevel,
    }).from(fiadoRecords)
      .leftJoin(customers, eq(fiadoRecords.customerId, customers.id))
      .where(and(
        eq(customers.storeId, session.storeId),
        ne(fiadoRecords.status, "PAID"),
        ne(fiadoRecords.status, "WRITTEN_OFF"),
      ))
      .groupBy(fiadoRecords.customerId, customers.name, customers.nickname, customers.phone, customers.riskLevel);

    const totalSummary = await db.select({
      total: sum(fiadoRecords.remainingAmount),
      count: count(),
    }).from(fiadoRecords)
      .leftJoin(customers, eq(fiadoRecords.customerId, customers.id))
      .where(and(
        eq(customers.storeId, session.storeId),
        ne(fiadoRecords.status, "PAID"),
        ne(fiadoRecords.status, "WRITTEN_OFF"),
      ));

    return NextResponse.json({
      fiados: result,
      customerDebts,
      summary: {
        total: parseFloat(totalSummary[0]?.total || "0"),
        count: totalSummary[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error("Fiado GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
