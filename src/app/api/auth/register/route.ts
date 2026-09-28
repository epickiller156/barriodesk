import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, stores, storeSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createSession } from "@/lib/auth";
import { z } from "zod";
import { slugify } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  storeName: z.string().min(2),
  storeNeighborhood: z.string().min(2),
  storeCity: z.string().min(2),
  storeProvince: z.string().min(2),
  storeType: z.string().default("kiosco"),
  storeAddress: z.string().min(5),
  plan: z.enum(["FREE", "VECINO", "MAXIKIOSCO"]).default("FREE"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, email, password, phone, storeName, storeNeighborhood, storeCity, storeProvince, storeType, storeAddress, plan } = parsed.data;

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "Ya existe una cuenta con este email" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({ name, email, passwordHash, phone, role: "OWNER" }).returning();

    const baseSlug = slugify(storeName);
    let slug = baseSlug;
    let slugCounter = 1;
    while (true) {
      const [existing] = await db.select().from(stores).where(eq(stores.slug, slug)).limit(1);
      if (!existing) break;
      slug = `${baseSlug}-${slugCounter++}`;
    }

    const [store] = await db.insert(stores).values({
      name: storeName,
      slug,
      address: storeAddress,
      neighborhood: storeNeighborhood,
      city: storeCity,
      province: storeProvince,
      plan: plan as "FREE" | "VECINO" | "MAXIKIOSCO",
      ownerId: user.id,
      storeType,
    }).returning();

    await db.insert(storeSettings).values({ storeId: store.id });

    await createSession(user.id, store.id, user.role);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      store: { id: store.id, name: store.name, plan: store.plan },
    }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
