import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendPushToStore, sendPushToUser, PushPayload } from "@/lib/push";
import { z } from "zod";

const sendSchema = z.object({
  target: z.enum(["store", "user"]),
  payload: z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    icon: z.string().optional(),
    url: z.string().optional(),
    tag: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = sendSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { target, payload } = parsed.data;

    const result = target === "store"
      ? await sendPushToStore(session.storeId, payload)
      : await sendPushToUser(session.userId, payload);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Push send error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
