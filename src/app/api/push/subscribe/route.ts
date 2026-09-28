import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { endpoint, p256dh, auth, userAgent } = parsed.data;

    // Verificar si ya existe esta suscripción
    const [existing] = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .limit(1);

    if (existing) {
      // Actualizar suscripción existente
      await db
        .update(pushSubscriptions)
        .set({
          userId: session.userId,
          storeId: session.storeId,
          p256dh,
          auth,
          userAgent,
          isActive: true,
        })
        .where(eq(pushSubscriptions.endpoint, endpoint));
    } else {
      // Crear nueva suscripción
      await db.insert(pushSubscriptions).values({
        userId: session.userId,
        storeId: session.storeId,
        endpoint,
        p256dh,
        auth,
        userAgent,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Push subscribe error:", error);
    
    // Si la tabla no existe, dar un mensaje más claro
    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      return NextResponse.json(
        { 
          error: "La tabla push_subscriptions no existe en la base de datos",
          details: "Ejecuta el SQL de migración en tu base de datos de producción"
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
