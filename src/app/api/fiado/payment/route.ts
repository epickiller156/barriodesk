import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { fiadoRecords, fiadoPayments, customers } from "@/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { z } from "zod";

const paymentSchema = z.object({
  customerId: z.string(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "MERCADOPAGO_QR", "TRANSFER", "DEBIT_CARD", "CREDIT_CARD", "FIADO", "MIXED"]),
  notes: z.string().optional(),
  fiadoRecordId: z.string().optional(), // specific record or auto-distribute
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

    const { customerId, amount, paymentMethod, notes, fiadoRecordId } = parsed.data;

    // Verify customer belongs to this store
    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.storeId, session.storeId)))
      .limit(1);
    if (!customer) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    let remainingPayment = amount;

    if (fiadoRecordId) {
      // Pay specific record
      const [record] = await db.select().from(fiadoRecords).where(eq(fiadoRecords.id, fiadoRecordId)).limit(1);
      if (record) {
        const paymentAmount = Math.min(remainingPayment, parseFloat(record.remainingAmount));
        const newPaidAmount = parseFloat(record.paidAmount) + paymentAmount;
        const newRemainingAmount = parseFloat(record.amount) - newPaidAmount;
        const newStatus = newRemainingAmount <= 0 ? "PAID" : "PARTIAL";

        await db.update(fiadoRecords).set({
          paidAmount: newPaidAmount.toFixed(2),
          remainingAmount: Math.max(0, newRemainingAmount).toFixed(2),
          status: newStatus,
          updatedAt: new Date(),
        }).where(eq(fiadoRecords.id, fiadoRecordId));

        await db.insert(fiadoPayments).values({
          fiadoRecordId,
          customerId,
          amount: paymentAmount.toFixed(2),
          paymentMethod,
          notes,
          registeredById: session.userId,
        });
        remainingPayment -= paymentAmount;
      }
    } else {
      // Auto-distribute FIFO (oldest first)
      const pendingRecords = await db.select().from(fiadoRecords)
        .where(and(
          eq(fiadoRecords.customerId, customerId),
          ne(fiadoRecords.status, "PAID"),
          ne(fiadoRecords.status, "WRITTEN_OFF"),
        ))
        .orderBy(fiadoRecords.createdAt);

      for (const record of pendingRecords) {
        if (remainingPayment <= 0) break;
        const paymentAmount = Math.min(remainingPayment, parseFloat(record.remainingAmount));
        const newPaidAmount = parseFloat(record.paidAmount) + paymentAmount;
        const newRemainingAmount = parseFloat(record.amount) - newPaidAmount;
        const newStatus = newRemainingAmount <= 0 ? "PAID" : "PARTIAL";

        await db.update(fiadoRecords).set({
          paidAmount: newPaidAmount.toFixed(2),
          remainingAmount: Math.max(0, newRemainingAmount).toFixed(2),
          status: newStatus,
          updatedAt: new Date(),
        }).where(eq(fiadoRecords.id, record.id));

        await db.insert(fiadoPayments).values({
          fiadoRecordId: record.id,
          customerId,
          amount: paymentAmount.toFixed(2),
          paymentMethod,
          notes,
          registeredById: session.userId,
        });
        remainingPayment -= paymentAmount;
      }
    }

    // Update customer total debt
    const newDebt = Math.max(0, parseFloat(customer.totalDebt) - amount);
    const riskLevel = newDebt > 10000 ? "RED" : newDebt > 3000 ? "YELLOW" : "GREEN";
    await db.update(customers).set({
      totalDebt: newDebt.toFixed(2),
      riskLevel: riskLevel as "RED" | "YELLOW" | "GREEN",
      updatedAt: new Date(),
    }).where(eq(customers.id, customerId));

    return NextResponse.json({ success: true, amountPaid: amount - remainingPayment });
  } catch (error) {
    console.error("Fiado payment error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
