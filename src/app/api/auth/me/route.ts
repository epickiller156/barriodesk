import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users, stores } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
    }).from(users).where(eq(users.id, session.userId)).limit(1);

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const [store] = await db.select().from(stores).where(eq(stores.id, session.storeId)).limit(1);

    return NextResponse.json({ user, store });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
