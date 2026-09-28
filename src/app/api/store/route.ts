import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateStoreSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  neighborhood: z.string().min(2).optional(),
  city: z.string().min(2).optional(),
  province: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  cuit: z.string().nullable().optional(),
  storeType: z.string().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateStoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.address !== undefined) updateData.address = parsed.data.address;
    if (parsed.data.neighborhood !== undefined) updateData.neighborhood = parsed.data.neighborhood;
    if (parsed.data.city !== undefined) updateData.city = parsed.data.city;
    if (parsed.data.province !== undefined) updateData.province = parsed.data.province;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
    if (parsed.data.whatsappNumber !== undefined) updateData.whatsappNumber = parsed.data.whatsappNumber;
    if (parsed.data.cuit !== undefined) updateData.cuit = parsed.data.cuit;
    if (parsed.data.storeType !== undefined) updateData.storeType = parsed.data.storeType;

    updateData.updatedAt = new Date();

    const [updatedStore] = await db
      .update(stores)
      .set(updateData)
      .where(eq(stores.id, session.storeId))
      .returning();

    return NextResponse.json({
      store: {
        id: updatedStore.id,
        name: updatedStore.name,
        address: updatedStore.address,
        neighborhood: updatedStore.neighborhood,
        city: updatedStore.city,
        province: updatedStore.province,
        phone: updatedStore.phone,
        whatsappNumber: updatedStore.whatsappNumber,
        cuit: updatedStore.cuit,
        storeType: updatedStore.storeType,
        slug: updatedStore.slug,
        plan: updatedStore.plan,
      },
    });
  } catch (error) {
    console.error("Update store error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
