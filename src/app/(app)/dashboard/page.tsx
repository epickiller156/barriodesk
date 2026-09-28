"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatARS, formatDateLong, getGreeting, getDaysUntil, formatDateTime } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardData {
  todaySales: { total: number; count: number };
  yesterdaySales: { total: number; count: number };
  todayFiado: { total: number; count: number };
  salesByPaymentMethod: { method: string; total: number; count: number }[];
  recentSales: { id: string; total: string; paymentMethod: string; createdAt: string; customerName: string }[];
  lowStockProducts: { id: string; name: string; stock: number; minStock: number }[];
  expiringProducts: { id: string; name: string; stock: number; expirationDate: string }[];
  totalFiado: { total: number; count: number };
  weeklySales: { date: string; total: number; count: number }[];
  unreadNotifications: number;
}

const paymentMethodLabels: Record<string, string> = {
  CASH: "💵 Efectivo", MERCADOPAGO_QR: "📱 MercadoPago", TRANSFER: "🏦 Transferencia",
  DEBIT_CARD: "💳 Débito", CREDIT_CARD: "💳 Crédito", FIADO: "📋 Fiado", MIXED: "💱 Mixto",
};

function MetricCard({ title, value, subtitle, icon, color, trend }: { title: string; value: string; subtitle?: string; icon: string; color: string; trend?: number }) {
  return (
    <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <span style={{ fontSize: "14px", color: "#718096", fontWeight: "500" }}>{title}</span>
        <span style={{ fontSize: "24px" }}>{icon}</span>
      </div>
      <div style={{ fontSize: "26px", fontWeight: "800", color, marginBottom: "4px" }}>{value}</div>
      {subtitle && <div style={{ fontSize: "12px", color: "#718096" }}>{subtitle}</div>}
      {trend !== undefined && (
        <div style={{ fontSize: "12px", color: trend >= 0 ? "#2ECC71" : "#E74C3C", marginTop: "4px", fontWeight: "600" }}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}% vs ayer
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Carlos");

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json()),
    ]).then(([dashData, meData]) => {
      setData(dashData);
      if (meData.user?.name) setUserName(meData.user.name.split(" ")[0]);
    }).finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const todayFormatted = format(today, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const todayCapitalized = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  if (loading) {
    return (
      <div style={{ padding: "24px" }}>
        <div style={{ height: "32px", width: "240px", marginBottom: "8px" }} className="skeleton" />
        <div style={{ height: "16px", width: "180px", marginBottom: "24px" }} className="skeleton" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "24px" }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: "100px" }} className="skeleton" />)}
        </div>
      </div>
    );
  }

  const trend = data && data.yesterdaySales.total > 0
    ? ((data.todaySales.total - data.yesterdaySales.total) / data.yesterdaySales.total) * 100
    : 0;

  const chartData = data?.weeklySales.map(d => ({
    day: format(new Date(d.date), "EEE", { locale: es }),
    total: d.total,
    count: d.count,
  })) || [];

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#1E3A5F", margin: "0 0 4px" }}>
          {getGreeting()}, {userName} 👋
        </h1>
        <p style={{ color: "#718096", fontSize: "14px" }}>{todayCapitalized}</p>
      </div>

      {/* Alerts */}
      {data && (data.lowStockProducts.length > 0 || data.expiringProducts.length > 0) && (
        <div style={{ background: "#FFF5F5", border: "1px solid #FED7D7", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
          <div style={{ fontWeight: "700", color: "#E74C3C", marginBottom: "8px" }}>⚠️ Alertas</div>
          {data.lowStockProducts.length > 0 && (
            <div style={{ fontSize: "14px", color: "#C0392B", marginBottom: "4px" }}>
              📦 {data.lowStockProducts.length} producto(s) con stock bajo
            </div>
          )}
          {data.expiringProducts.filter(p => getDaysUntil(p.expirationDate) <= 5).length > 0 && (
            <div style={{ fontSize: "14px", color: "#C0392B" }}>
              ⏰ {data.expiringProducts.filter(p => getDaysUntil(p.expirationDate) <= 5).length} producto(s) que vencen en menos de 5 días
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "24px" }}>
        <MetricCard
          title="Ventas del día"
          value={formatARS(data?.todaySales.total)}
          subtitle={`${data?.todaySales.count || 0} transacciones`}
          icon="💰"
          color="#1E3A5F"
          trend={trend}
        />
        <MetricCard
          title="Transacciones"
          value={(data?.todaySales.count || 0).toString()}
          subtitle={`Ticket promedio: ${formatARS((data?.todaySales.total || 0) / Math.max(data?.todaySales.count || 1, 1))}`}
          icon="🧾"
          color="#2D5A8E"
        />
        <MetricCard
          title="Fiado del día"
          value={formatARS(data?.todayFiado.total)}
          subtitle={`${data?.todayFiado.count || 0} ventas fiadas`}
          icon="📋"
          color="#F5A623"
        />
        <MetricCard
          title="Total en la calle"
          value={formatARS(data?.totalFiado.total)}
          subtitle={`${data?.totalFiado.count || 0} deudas activas`}
          icon="💸"
          color="#E74C3C"
        />
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "24px" }}>
        <Link href="/pos" style={{ background: "#1E3A5F", color: "white", padding: "16px", borderRadius: "12px", textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", fontWeight: "700", fontSize: "15px", minHeight: "56px" }}>
          🛒 Nueva venta
        </Link>
        <Link href="/fiado" style={{ background: "#F5A623", color: "white", padding: "16px", borderRadius: "12px", textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", fontWeight: "700", fontSize: "15px", minHeight: "56px" }}>
          📋 Ver fiados
        </Link>
      </div>

      {/* Weekly chart */}
      <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E2E8F0" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1A202C", marginBottom: "16px" }}>📈 Ventas de la semana</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#718096" }} />
            <YAxis tick={{ fontSize: 12, fill: "#718096" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => [formatARS(Number(v)), "Ventas"]} labelStyle={{ color: "#1A202C" }} />
            <Bar dataKey="total" fill="#1E3A5F" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent sales */}
      <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1A202C" }}>🕐 Últimas ventas</h2>
          <Link href="/reports" style={{ color: "#1E3A5F", fontSize: "14px", fontWeight: "600", textDecoration: "none" }}>Ver todas →</Link>
        </div>
        {data?.recentSales.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px", color: "#718096" }}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>🛒</div>
            <p>Todavía no hay ventas. <Link href="/pos" style={{ color: "#1E3A5F", fontWeight: "600" }}>¡Hacé tu primera venta!</Link></p>
          </div>
        ) : (
          data?.recentSales.map(sale => (
            <div key={sale.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F7FAFC" }}>
              <div>
                <div style={{ fontWeight: "600", color: "#1A202C", fontSize: "14px" }}>{sale.customerName}</div>
                <div style={{ fontSize: "12px", color: "#718096" }}>
                  {formatDateTime(sale.createdAt)} · {paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod}
                </div>
              </div>
              <div style={{ fontWeight: "700", color: "#1E3A5F", fontSize: "16px" }}>{formatARS(sale.total)}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Low stock */}
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: "#1A202C" }}>📦 Stock bajo</h2>
            <Link href="/inventory?stock=low" style={{ color: "#1E3A5F", fontSize: "12px", fontWeight: "600", textDecoration: "none" }}>Ver →</Link>
          </div>
          {data?.lowStockProducts.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#718096", textAlign: "center", padding: "12px 0" }}>✅ Todo en orden</p>
          ) : (
            data?.lowStockProducts.slice(0, 4).map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F7FAFC" }}>
                <span style={{ fontSize: "12px", color: "#1A202C", flex: 1, marginRight: "8px" }}>{p.name}</span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: p.stock === 0 ? "#E74C3C" : "#F39C12" }}>{p.stock} ud.</span>
              </div>
            ))
          )}
        </div>

        {/* Expiring */}
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: "#1A202C" }}>⏰ Por vencer</h2>
            <Link href="/inventory?expiring=true" style={{ color: "#1E3A5F", fontSize: "12px", fontWeight: "600", textDecoration: "none" }}>Ver →</Link>
          </div>
          {data?.expiringProducts.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#718096", textAlign: "center", padding: "12px 0" }}>✅ Sin alertas</p>
          ) : (
            data?.expiringProducts.slice(0, 4).map(p => {
              const days = getDaysUntil(p.expirationDate);
              return (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F7FAFC" }}>
                  <span style={{ fontSize: "12px", color: "#1A202C", flex: 1, marginRight: "8px" }}>{p.name}</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: days <= 5 ? "#E74C3C" : days <= 15 ? "#F39C12" : "#2ECC71", background: days <= 5 ? "#FFF5F5" : days <= 15 ? "#FFFBEB" : "#F0FFF4", padding: "2px 6px", borderRadius: "20px", whiteSpace: "nowrap" }}>
                    {days <= 0 ? "Vencido" : `${days}d`}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
