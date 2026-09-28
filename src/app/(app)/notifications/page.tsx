"use client";
import { useState, useEffect } from "react";
import { formatTimeAgo } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  LOW_STOCK: "📦", EXPIRATION_ALERT: "⏰", FIADO_OVERDUE: "💸",
  PLAN_EXPIRING: "⭐", SYSTEM: "🔔",
};
const typeColors: Record<string, string> = {
  LOW_STOCK: "#F39C12", EXPIRATION_ALERT: "#E74C3C", FIADO_OVERDUE: "#E74C3C",
  PLAN_EXPIRING: "#9B59B6", SYSTEM: "#3498DB",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const data = await fetch("/api/notifications").then(r => r.json());
    setNotifications(data.notifications || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    await Promise.all(notifications.filter(n => !n.isRead).map(n => fetch(`/api/notifications/${n.id}/read`, { method: "PUT" })));
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unread = notifications.filter(n => !n.isRead);

  if (loading) return <div style={{ padding: "24px" }}>⏳ Cargando...</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F" }}>🔔 Notificaciones</h1>
        {unread.length > 0 && (
          <button onClick={markAllRead} style={{ padding: "8px 14px", background: "white", color: "#1E3A5F", border: "1px solid #1E3A5F", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", minHeight: "36px" }}>
            ✓ Marcar todas como leídas
          </button>
        )}
      </div>

      {unread.length > 0 && (
        <div style={{ background: "#EBF4FF", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", color: "#1E3A5F", fontSize: "14px", fontWeight: "600" }}>
          Tenés {unread.length} notificación(es) sin leer
        </div>
      )}

      {notifications.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", color: "#718096", background: "white", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔔</div>
          <p style={{ fontWeight: "600", fontSize: "16px" }}>Sin notificaciones</p>
          <p style={{ fontSize: "14px", marginTop: "4px" }}>Te avisaremos cuando haya algo importante</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {notifications.map(n => (
            <div key={n.id} onClick={() => !n.isRead && markRead(n.id)}
              style={{ background: n.isRead ? "white" : "#F0F4FF", borderRadius: "12px", padding: "16px", border: `1px solid ${n.isRead ? "#E2E8F0" : "#C3D9FF"}`, cursor: n.isRead ? "default" : "pointer", display: "flex", gap: "14px" }}>
              <div style={{ width: "44px", height: "44px", background: typeColors[n.type] + "15", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
                {typeIcons[n.type] || "🔔"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                  <div style={{ fontWeight: n.isRead ? "600" : "800", fontSize: "15px", color: "#1A202C" }}>{n.title}</div>
                  {!n.isRead && <span style={{ background: "#1E3A5F", color: "white", fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", flexShrink: 0, marginLeft: "8px" }}>NUEVO</span>}
                </div>
                <p style={{ fontSize: "13px", color: "#718096", lineHeight: "1.4", margin: "0 0 6px" }}>{n.message}</p>
                <span style={{ fontSize: "12px", color: "#A0AEC0" }}>{formatTimeAgo(n.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
