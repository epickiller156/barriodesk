"use client";
import { useState, useEffect } from "react";
import { formatARS, formatDate } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

interface SalesData {
  summary: { total: number; count: number; discount: number; avgTicket: number };
  byMethod: { method: string; total: number; count: number }[];
  daily: { date: string; total: number; count: number }[];
  topProducts: { productId: string; productName: string; totalQuantity: number; totalRevenue: number; count: number }[];
}

const methodLabels: Record<string, string> = {
  CASH: "Efectivo", MERCADOPAGO_QR: "MercadoPago", TRANSFER: "Transferencia",
  DEBIT_CARD: "Débito", CREDIT_CARD: "Crédito", FIADO: "Fiado",
};
const PIE_COLORS = ["#1E3A5F", "#F5A623", "#2ECC71", "#3498DB", "#9B59B6", "#E74C3C"];

const dateRanges = [
  { label: "Hoy", value: "today" },
  { label: "Ayer", value: "yesterday" },
  { label: "Esta semana", value: "week" },
  { label: "Este mes", value: "month" },
];

function getDateRange(range: string): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);
  if (range === "today") return { dateFrom: todayStart.toISOString(), dateTo: todayEnd.toISOString() };
  if (range === "yesterday") {
    const y = new Date(todayStart); y.setDate(y.getDate()-1);
    const ye = new Date(todayEnd); ye.setDate(ye.getDate()-1);
    return { dateFrom: y.toISOString(), dateTo: ye.toISOString() };
  }
  if (range === "week") {
    const w = new Date(todayStart); w.setDate(w.getDate()-6);
    return { dateFrom: w.toISOString(), dateTo: todayEnd.toISOString() };
  }
  if (range === "month") {
    const m = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: m.toISOString(), dateTo: todayEnd.toISOString() };
  }
  return { dateFrom: todayStart.toISOString(), dateTo: todayEnd.toISOString() };
}

export default function ReportsPage() {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("week");

  const loadData = async () => {
    setLoading(true);
    const { dateFrom, dateTo } = getDateRange(dateRange);
    const data = await fetch(`/api/reports/sales?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`).then(r => r.json());
    setSalesData(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [dateRange]);

  return (
    <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F", marginBottom: "20px" }}>📊 Reportes</h1>

      {/* Date range selector */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
        {dateRanges.map(r => (
          <button key={r.value} onClick={() => setDateRange(r.value)}
            style={{ padding: "8px 16px", background: dateRange === r.value ? "#1E3A5F" : "white", color: dateRange === r.value ? "white" : "#4A5568", border: `1px solid ${dateRange === r.value ? "#1E3A5F" : "#E2E8F0"}`, borderRadius: "20px", cursor: "pointer", fontWeight: dateRange === r.value ? "700" : "400", fontSize: "14px", minHeight: "40px" }}>
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: "180px" }} className="skeleton" />)}
        </div>
      ) : salesData ? (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {[
              { label: "Total vendido", value: formatARS(salesData.summary.total), icon: "💰", color: "#1E3A5F" },
              { label: "Transacciones", value: salesData.summary.count.toString(), icon: "🧾", color: "#2D5A8E" },
              { label: "Ticket promedio", value: formatARS(salesData.summary.avgTicket), icon: "📊", color: "#2ECC71" },
              { label: "Descuentos dados", value: formatARS(salesData.summary.discount), icon: "🏷️", color: "#F39C12" },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: "white", borderRadius: "12px", padding: "16px", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#718096" }}>{kpi.label}</span>
                  <span style={{ fontSize: "20px" }}>{kpi.icon}</span>
                </div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: kpi.color, marginTop: "4px" }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Daily chart */}
          <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "20px", border: "1px solid #E2E8F0" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", color: "#1A202C" }}>📈 Ventas diarias</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={salesData.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#718096" }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "#718096" }} tickFormatter={v => `$${(Number(v)/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [formatARS(Number(v)), "Ventas"]} />
                <Bar dataKey="total" fill="#1E3A5F" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            {/* Payment methods pie */}
            <div style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid #E2E8F0" }}>
              <h2 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "16px", color: "#1A202C" }}>💳 Por método de pago</h2>
              {salesData.byMethod.length === 0 ? (
                <p style={{ color: "#718096", textAlign: "center", padding: "20px" }}>Sin datos</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={salesData.byMethod} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={70} label={(entry) => `${methodLabels[entry.method as string] || entry.method} ${((entry.percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {salesData.byMethod.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatARS(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                  {salesData.byMethod.map((m, i) => (
                    <div key={m.method} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #F7FAFC" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span style={{ fontSize: "13px" }}>{methodLabels[m.method] || m.method}</span>
                      </div>
                      <span style={{ fontWeight: "700", fontSize: "13px" }}>{formatARS(m.total)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Top products */}
            <div style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid #E2E8F0" }}>
              <h2 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "16px", color: "#1A202C" }}>🏆 Productos más vendidos</h2>
              {salesData.topProducts.length === 0 ? (
                <p style={{ color: "#718096", textAlign: "center", padding: "20px" }}>Sin datos</p>
              ) : (
                salesData.topProducts.slice(0, 8).map((p, i) => (
                  <div key={p.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: "1px solid #F7FAFC" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: "800", color: "#A0AEC0", fontSize: "13px", minWidth: "18px" }}>#{i+1}</span>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#1A202C", lineHeight: "1.3" }}>{p.productName}</div>
                        <div style={{ fontSize: "11px", color: "#718096" }}>{p.totalQuantity.toFixed(0)} unidades</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: "700", color: "#1E3A5F", fontSize: "13px" }}>{formatARS(p.totalRevenue)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
