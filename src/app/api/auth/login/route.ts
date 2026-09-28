import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { comparePassword, createSession } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Tu cuenta está desactivada" }, { status: 403 });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 });
    }

    const [store] = await db.select().from(stores).where(eq(stores.ownerId, user.id)).limit(1);
    
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    
    await createSession(user.id, store?.id || "", user.role);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      store: store ? { id: store.id, name: store.name, plan: store.plan } : null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
