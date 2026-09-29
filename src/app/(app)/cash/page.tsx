"use client";
import { useState, useEffect } from "react";
import { formatARS, formatDateTime } from "@/lib/utils";

interface CashClosing {
  id: string;
  openedAt: string;
  closedAt: string;
  openingCash: string;
  totalCashSales: string;
  totalMpSales: string;
  totalTransferSales: string;
  totalCardSales: string;
  totalFiadoSales: string;
  totalSales: string;
  theoreticalCash: string;
  actualCash: string;
  difference: string;
  totalTransactions: number;
  notes: string | null;
  createdAt: string;
}

interface SalesByMethod {
  paymentMethod: string;
  total: string;
  count: number;
}

const methodLabels: Record<string, string> = {
  CASH: "💵 Efectivo", MERCADOPAGO_QR: "📱 MercadoPago", TRANSFER: "🏦 Transferencia",
  DEBIT_CARD: "💳 Débito", CREDIT_CARD: "💳 Crédito", FIADO: "📋 Fiado",
};

export default function CashPage() {
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [todaySalesByMethod, setTodaySalesByMethod] = useState<SalesByMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [openingCash, setOpeningCash] = useState("5000");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [closing, setClosing] = useState(false);
  const [openedAt] = useState(new Date().toISOString());

  const loadData = async () => {
    const data = await fetch("/api/cash").then(r => r.json());
    setClosings(data.closings || []);
    setTodaySalesByMethod(data.todaySalesByMethod || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const totalCash = todaySalesByMethod.find(s => s.paymentMethod === "CASH");
  const totalSales = todaySalesByMethod.reduce((s, m) => s + parseFloat(m.total || "0"), 0);
  const expectedCash = parseFloat(openingCash || "0") + parseFloat(totalCash?.total || "0");
  const diff = parseFloat(actualCash || "0") - expectedCash;

  const handleClose = async () => {
    if (!actualCash) { alert("Ingresá el efectivo real en caja"); return; }
    if (!confirm("¿Cerrar la caja? Esta acción no se puede deshacer.")) return;
    setClosing(true);
    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openedAt, openingCash: parseFloat(openingCash), actualCash: parseFloat(actualCash), notes }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowCloseForm(false);
        setActualCash("");
        setNotes("");
        loadData();
        alert("✅ Caja cerrada correctamente");
      } else {
        alert(data.error || "Error al cerrar la caja");
      }
    } catch {
      alert("Error de conexión. Intentá de nuevo.");
    } finally { setClosing(false); }
  };

  if (loading) return <div style={{ padding: "24px" }}>⏳ Cargando...</div>;

  const lastClosing = closings[0];

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F" }}>💰 Cierre de Caja</h1>
        <button onClick={() => setShowCloseForm(true)}
          style={{ padding: "10px 16px", background: "#1E3A5F", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px", minHeight: "44px" }}>
          📊 Cerrar caja
        </button>
      </div>

      {/* Today's summary */}
      <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "20px", border: "1px solid #E2E8F0" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1A202C", marginBottom: "16px" }}>📊 Estado de caja hoy</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div style={{ background: "#F7FAFC", borderRadius: "10px", padding: "14px" }}>
            <div style={{ fontSize: "12px", color: "#718096", marginBottom: "4px" }}>Fondo inicial</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F" }}>{formatARS(openingCash)}</div>
          </div>
          <div style={{ background: "#F0FFF4", borderRadius: "10px", padding: "14px" }}>
            <div style={{ fontSize: "12px", color: "#718096", marginBottom: "4px" }}>Total vendido hoy</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#2ECC71" }}>{formatARS(totalSales)}</div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "14px" }}>
          <div style={{ fontWeight: "600", fontSize: "14px", color: "#718096", marginBottom: "10px" }}>Por método de pago:</div>
          {todaySalesByMethod.length === 0 ? (
            <p style={{ color: "#A0AEC0", fontSize: "14px" }}>Sin ventas aún hoy</p>
          ) : (
            todaySalesByMethod.map(m => (
              <div key={m.paymentMethod} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F7FAFC" }}>
                <span style={{ fontSize: "14px", color: "#4A5568" }}>{methodLabels[m.paymentMethod] || m.paymentMethod} ({m.count} ventas)</span>
                <span style={{ fontWeight: "700", color: "#1E3A5F" }}>{formatARS(m.total)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Close modal */}
      {showCloseForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", maxWidth: "480px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1E3A5F" }}>📊 Cerrar caja</h2>
              <button onClick={() => setShowCloseForm(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            {/* Sales summary */}
            <div style={{ background: "#F7FAFC", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ fontWeight: "700", marginBottom: "10px", fontSize: "14px" }}>Ventas del turno:</div>
              {todaySalesByMethod.map(m => (
                <div key={m.paymentMethod} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ fontSize: "13px", color: "#4A5568" }}>{methodLabels[m.paymentMethod] || m.paymentMethod}</span>
                  <span style={{ fontWeight: "700" }}>{formatARS(m.total)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "2px solid #E2E8F0", marginTop: "8px" }}>
                <span style={{ fontWeight: "700" }}>TOTAL:</span>
                <span style={{ fontWeight: "800", color: "#1E3A5F" }}>{formatARS(totalSales)}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Fondo inicial ($)</label>
                <input type="number" value={openingCash} onChange={e => setOpeningCash(e.target.value)}
                  style={{ width: "100%", padding: "12px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "16px", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Efectivo real en caja ($) *</label>
                <input type="number" value={actualCash} onChange={e => setActualCash(e.target.value)} placeholder="Contá el dinero físico..."
                  style={{ width: "100%", padding: "12px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "18px", fontWeight: "700", outline: "none" }} />
              </div>
            </div>

            {/* Difference calculation */}
            {actualCash && (
              <div style={{ background: Math.abs(diff) < 1 ? "#F0FFF4" : diff > 0 ? "#F0FFF4" : "#FFF5F5", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "13px", color: "#718096" }}>Efectivo esperado:</span>
                  <span style={{ fontWeight: "700" }}>{formatARS(expectedCash)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "13px", color: "#718096" }}>Efectivo real:</span>
                  <span style={{ fontWeight: "700" }}>{formatARS(actualCash)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", borderTop: "1px solid #E2E8F0" }}>
                  <span style={{ fontWeight: "700", fontSize: "15px" }}>Diferencia:</span>
                  <span style={{ fontWeight: "800", fontSize: "18px", color: Math.abs(diff) < 1 ? "#2ECC71" : diff > 0 ? "#2ECC71" : "#E74C3C" }}>
                    {diff > 0 ? "+" : ""}{formatARS(diff)}
                    {Math.abs(diff) >= 1 && <span style={{ fontSize: "12px", marginLeft: "4px" }}>{diff > 0 ? "(sobrante)" : "(faltante)"}</span>}
                  </span>
                </div>
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Notas (opcional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Se usó $200 para comprar cambio"
                style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px", resize: "vertical", minHeight: "70px", outline: "none" }} />
            </div>

            <button onClick={handleClose} disabled={closing}
              style={{ width: "100%", padding: "14px", background: closing ? "#A0AEC0" : "#E74C3C", color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "800", cursor: "pointer", minHeight: "52px" }}>
              {closing ? "⏳ Cerrando..." : "🔒 CERRAR CAJA"}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1A202C" }}>🕐 Historial de cierres</h2>
        </div>
        {closings.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#718096" }}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>📊</div>
            <p>No hay cierres de caja aún</p>
          </div>
        ) : (
          closings.map(c => {
            const diff = parseFloat(c.difference);
            return (
              <div key={c.id} style={{ padding: "16px 20px", borderBottom: "1px solid #F7FAFC", display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "12px", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "14px", color: "#1A202C" }}>{formatDateTime(c.closedAt)}</div>
                  <div style={{ fontSize: "12px", color: "#718096" }}>{c.totalTransactions} transacciones</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: "700", color: "#1E3A5F" }}>{formatARS(c.totalSales)}</div>
                  <div style={{ fontSize: "12px", color: "#718096" }}>ventas totales</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: "700", color: "#4A5568" }}>{formatARS(c.actualCash)}</div>
                  <div style={{ fontSize: "12px", color: "#718096" }}>efectivo real</div>
                </div>
                <div style={{ textAlign: "center", minWidth: "70px" }}>
                  <span style={{ fontWeight: "800", fontSize: "14px", color: Math.abs(diff) < 1 ? "#2ECC71" : diff > 0 ? "#2ECC71" : "#E74C3C", background: Math.abs(diff) < 1 ? "#F0FFF4" : diff > 0 ? "#F0FFF4" : "#FFF5F5", padding: "3px 10px", borderRadius: "20px" }}>
                    {diff > 0 ? "+" : ""}{formatARS(diff)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
