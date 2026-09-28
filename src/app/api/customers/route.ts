import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, and, ilike, desc } from "drizzle-orm";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1),
  nickname: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  dni: z.string().optional(),
  creditLimit: z.string().optional(),
  cbuAlias: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "debt";

    const conditions = [eq(customers.storeId, session.storeId), eq(customers.isActive, true)];
    if (search) conditions.push(ilike(customers.name, `%${search}%`));

    const result = await db.select().from(customers)
      .where(and(...conditions))
      .orderBy(desc(customers.totalDebt));

    return NextResponse.json({ customers: result });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await req.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

    const [customer] = await db.insert(customers).values({
      ...parsed.data,
      storeId: session.storeId,
    }).returning();

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
