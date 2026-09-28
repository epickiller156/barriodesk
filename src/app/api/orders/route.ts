import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");

    const conditions = [eq(orders.storeId, session.storeId)];
    if (status) conditions.push(eq(orders.status, status as "NEW" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED"));

    const result = await db.select().from(orders)
      .where(eq(orders.storeId, session.storeId))
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    return NextResponse.json({ orders: result });
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
