"use client";

import { useState, useEffect } from "react";

export default function PushNotificationButton() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    setLoading(true);
    try {
      // 1. Pedir permiso
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== "granted") {
        alert("Permiso de notificaciones denegado");
        return;
      }

      // 2. Obtener Service Worker
      const reg = await navigator.serviceWorker.ready;

      // 3. Suscribirse al servicio push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
        ),
      });

      // 4. Enviar suscripción al servidor
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: btoa(
            String.fromCharCode(
              ...new Uint8Array(subscription.getKey("p256dh") || new ArrayBuffer(0))
            )
          ),
          auth: btoa(
            String.fromCharCode(
              ...new Uint8Array(subscription.getKey("auth") || new ArrayBuffer(0))
            )
          ),
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        alert("¡Notificaciones activadas!");
      } else {
        alert("Error al guardar la suscripción");
      }
    } catch (error) {
      console.error("Error al suscribirse:", error);
      alert("Error al activar notificaciones. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      
      if (subscription) {
        // Notificar al servidor
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        
        // Desuscribirse
        await subscription.unsubscribe();
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error("Error al desuscribirse:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "16px",
        border: "1px solid #E2E8F0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
        <span style={{ fontSize: "24px" }}>🔔</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: "14px", color: "#1A202C" }}>
            Notificaciones push
          </div>
          <div style={{ fontSize: "12px", color: "#718096" }}>
            {isSubscribed
              ? "Recibí alertas de stock, vencimientos y pedidos"
              : "Activá para recibir alertas importantes"}
          </div>
        </div>
      </div>
      
      {isSubscribed ? (
        <button
          onClick={unsubscribe}
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: "#FFF5F5",
            color: "#E74C3C",
            border: "1px solid #FED7D7",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: 600,
            minHeight: "40px",
          }}
        >
          {loading ? "..." : "Desactivar"}
        </button>
      ) : (
        <button
          onClick={subscribe}
          disabled={loading || permission === "denied"}
          style={{
            padding: "8px 16px",
            background: permission === "denied" ? "#E2E8F0" : "#1E3A5F",
            color: permission === "denied" ? "#718096" : "white",
            border: "none",
            borderRadius: "8px",
            cursor: permission === "denied" ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: 600,
            minHeight: "40px",
          }}
        >
          {loading ? "Activando..." : permission === "denied" ? "Bloqueado" : "Activar"}
        </button>
      )}
    </div>
  );
}
