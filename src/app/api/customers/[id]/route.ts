import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { customers, fiadoRecords, fiadoPayments, sales, saleItems } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { id } = await params;

    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.storeId, session.storeId)))
      .limit(1);
    if (!customer) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    const fiadoList = await db.select({
      id: fiadoRecords.id,
      amount: fiadoRecords.amount,
      paidAmount: fiadoRecords.paidAmount,
      remainingAmount: fiadoRecords.remainingAmount,
      status: fiadoRecords.status,
      dueDate: fiadoRecords.dueDate,
      createdAt: fiadoRecords.createdAt,
      saleId: fiadoRecords.saleId,
    }).from(fiadoRecords)
      .where(eq(fiadoRecords.customerId, id))
      .orderBy(desc(fiadoRecords.createdAt));

    const payments = await db.select().from(fiadoPayments)
      .where(eq(fiadoPayments.customerId, id))
      .orderBy(desc(fiadoPayments.createdAt));

    return NextResponse.json({ customer, fiadoRecords: fiadoList, payments });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { id } = await params;

    const body = await req.json();
    const [updated] = await db.update(customers).set({ ...body, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.storeId, session.storeId)))
      .returning();

    return NextResponse.json({ customer: updated });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { id } = await params;

    await db.update(customers).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.storeId, session.storeId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
