import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

// Configurar VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:barriodesk@gmail.com",
  process.env.VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Enviar notificación push a una suscripción específica
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icons/icon-192.png",
        badge: payload.badge || "/icons/icon-72.png",
        tag: payload.tag || "barriodesk-notification",
        data: {
          url: payload.url || "/dashboard",
        },
      })
    );
    return { success: true };
  } catch (error: any) {
    console.error("Error enviando push:", error.message);
    
    // Si la suscripción expiró (410 Gone), marcar como inactiva
    if (error.statusCode === 410) {
      await db
        .update(pushSubscriptions)
        .set({ isActive: false })
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Enviar notificación a todas las suscripciones activas de un local
 */
export async function sendPushToStore(
  storeId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.storeId, storeId));

  const activeSubscriptions = subscriptions.filter((s) => s.isActive);
  
  if (activeSubscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  await Promise.all(
    activeSubscriptions.map(async (sub) => {
      const result = await sendPushNotification(
        {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
        payload
      );
      
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    })
  );

  return { sent, failed };
}

/**
 * Enviar notificación a un usuario específico
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  const activeSubscriptions = subscriptions.filter((s) => s.isActive);
  
  if (activeSubscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  await Promise.all(
    activeSubscriptions.map(async (sub) => {
      const result = await sendPushNotification(
        {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
        payload
      );
      
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    })
  );

  return { sent, failed };
}

/**
 * Notificaciones predefinidas para eventos del negocio
 */
export const pushTemplates = {
  lowStock: (productName: string, stock: number): PushPayload => ({
    title: "📦 Stock bajo",
    body: `${productName} — quedan ${stock} unidades`,
    url: "/inventory?stock=low",
    tag: "low-stock",
  }),

  expiringProduct: (productName: string, days: number): PushPayload => ({
    title: "⏰ Vencimiento próximo",
    body: `${productName} vence en ${days} días`,
    url: "/inventory?expiring=true",
    tag: "expiring",
  }),

  fiadoOverdue: (customerName: string, amount: string): PushPayload => ({
    title: "⚠️ Fiado vencido",
    body: `${customerName} tiene una deuda de ${amount}`,
    url: "/fiado",
    tag: "fiado-overdue",
  }),

  newOrder: (customerName: string, total: string): PushPayload => ({
    title: "🛒 Nuevo pedido",
    body: `${customerName} — ${total}`,
    url: "/orders",
    tag: "new-order",
  }),

  cashClosing: (total: string): PushPayload => ({
    title: "💰 Caja cerrada",
    body: `Total en ventas: ${total}`,
    url: "/cash",
    tag: "cash-closing",
  }),

  newSale: (total: string, paymentMethod: string): PushPayload => ({
    title: "✅ Venta registrada",
    body: `${total} — ${paymentMethod}`,
    url: "/pos",
    tag: "new-sale",
  }),
};
