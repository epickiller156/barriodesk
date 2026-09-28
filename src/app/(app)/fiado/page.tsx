"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatARS, formatDate, getDaysSince, generateWhatsAppUrl } from "@/lib/utils";

interface CustomerDebt {
  customerId: string;
  totalDebt: string;
  count: number;
  customerName: string;
  customerNickname: string | null;
  customerPhone: string | null;
  customerRiskLevel: string;
}

interface FiadoSummary {
  total: number;
  count: number;
}

interface Fiado {
  id: string;
  customerId: string;
  amount: string;
  paidAmount: string;
  remainingAmount: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  customerName: string;
  customerNickname: string | null;
  customerPhone: string | null;
  customerRiskLevel: string;
  customerTotalDebt: string;
}

const riskColors: Record<string, string> = { GREEN: "#2ECC71", YELLOW: "#F39C12", RED: "#E74C3C" };
const riskLabels: Record<string, string> = { GREEN: "✅ Al día", YELLOW: "⚠️ Atrasado", RED: "🔴 Riesgo alto" };

export default function FiadoPage() {
  const [customerDebts, setCustomerDebts] = useState<CustomerDebt[]>([]);
  const [summary, setSummary] = useState<FiadoSummary>({ total: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [payingCustomer, setPayingCustomer] = useState<CustomerDebt | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState("");
  const [storeInfo, setStoreInfo] = useState<{ name: string; cbuAlias: string | null } | null>(null);

  const loadData = async () => {
    const [fiadoData, meData] = await Promise.all([
      fetch("/api/fiado").then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json()),
    ]);
    setCustomerDebts(fiadoData.customerDebts || []);
    setSummary(fiadoData.summary || { total: 0, count: 0 });
    if (meData.store) setStoreInfo({ name: meData.store.name, cbuAlias: null });
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handlePayment = async () => {
    if (!payingCustomer || !payAmount || parseFloat(payAmount) <= 0) return;
    setPaying(true);
    try {
      const res = await fetch("/api/fiado/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: payingCustomer.customerId,
          amount: parseFloat(payAmount),
          paymentMethod: payMethod,
          notes: payNotes,
        }),
      });
      if (res.ok) {
        setPaySuccess(`✅ Pago de ${formatARS(parseFloat(payAmount))} registrado`);
        setPayingCustomer(null);
        setPayAmount("");
        setPayNotes("");
        loadData();
        setTimeout(() => setPaySuccess(""), 4000);
      }
    } finally { setPaying(false); }
  };

  const generateWhatsApp = (customer: CustomerDebt) => {
    if (!customer.customerPhone) return;
    const msg = `Hola ${customer.customerNickname || customer.customerName} 👋\n\nTe mandamos tu resumen de cuenta de ${storeInfo?.name || "nuestro local"}:\n\n💰 *Total pendiente: ${formatARS(customer.totalDebt)}*\n\nPodés pagarla en el local${storeInfo?.cbuAlias ? ` o por transferencia al alias:\n🏦 ${storeInfo.cbuAlias}` : ""}.\n\n¡Gracias por confiar en nosotros! 🙌`;
    window.open(generateWhatsAppUrl(customer.customerPhone, msg), "_blank");
  };

  // Group by risk level
  const greenCustomers = customerDebts.filter(c => c.customerRiskLevel === "GREEN");
  const yellowCustomers = customerDebts.filter(c => c.customerRiskLevel === "YELLOW");
  const redCustomers = customerDebts.filter(c => c.customerRiskLevel === "RED");

  if (loading) return <div style={{ padding: "24px" }}>{[1,2,3].map(i => <div key={i} style={{ height: "80px", marginBottom: "10px" }} className="skeleton" />)}</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F" }}>📋 Fiado Digital</h1>
        <Link href="/fiado/customers/new" style={{ padding: "10px 16px", background: "#1E3A5F", color: "white", borderRadius: "10px", textDecoration: "none", fontWeight: "700", fontSize: "14px", minHeight: "44px", display: "flex", alignItems: "center" }}>
          ➕ Nuevo cliente
        </Link>
      </div>

      {paySuccess && <div style={{ background: "#F0FFF4", border: "1px solid #9AE6B4", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", color: "#2D6A4F", fontWeight: "600" }}>{paySuccess}</div>}

      {/* Summary card */}
      <div style={{ background: "linear-gradient(135deg, #1E3A5F, #2D5A8E)", borderRadius: "16px", padding: "24px", marginBottom: "24px", color: "white" }}>
        <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", marginBottom: "8px" }}>💸 PLATA EN LA CALLE</div>
        <div style={{ fontSize: "40px", fontWeight: "900", marginBottom: "16px" }}>{formatARS(summary.total)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { color: "#2ECC71", label: `🟢 Al día: ${formatARS(greenCustomers.reduce((s, c) => s + parseFloat(c.totalDebt || "0"), 0))}`, sub: `${greenCustomers.length} clientes` },
            { color: "#F39C12", label: `🟡 Atrasado: ${formatARS(yellowCustomers.reduce((s, c) => s + parseFloat(c.totalDebt || "0"), 0))}`, sub: `${yellowCustomers.length} clientes` },
            { color: "#E74C3C", label: `🔴 Alto riesgo: ${formatARS(redCustomers.reduce((s, c) => s + parseFloat(c.totalDebt || "0"), 0))}`, sub: `${redCustomers.length} clientes` },
          ].map((item, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px 12px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: item.color }}>{item.label}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginTop: "2px" }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment modal */}
      {payingCustomer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", maxWidth: "400px", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#1E3A5F" }}>💰 Registrar pago</h2>
              <button onClick={() => { setPayingCustomer(null); setPayAmount(""); }} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ background: "#F7FAFC", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
              <div style={{ fontWeight: "700", fontSize: "15px" }}>{payingCustomer.customerNickname || payingCustomer.customerName}</div>
              <div style={{ color: "#718096", fontSize: "13px" }}>Deuda total: <strong style={{ color: "#E74C3C" }}>{formatARS(payingCustomer.totalDebt)}</strong></div>
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Monto del pago</label>
              <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                placeholder={payingCustomer.totalDebt}
                style={{ width: "100%", padding: "12px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "18px", fontWeight: "700", textAlign: "center", outline: "none" }} />
              <button onClick={() => setPayAmount(payingCustomer.totalDebt)}
                style={{ marginTop: "6px", width: "100%", padding: "8px", background: "#EBF4FF", color: "#1E3A5F", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", minHeight: "36px" }}>
                Pago total: {formatARS(payingCustomer.totalDebt)}
              </button>
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Método de pago</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px" }}>
                <option value="CASH">💵 Efectivo</option>
                <option value="TRANSFER">🏦 Transferencia</option>
                <option value="MERCADOPAGO_QR">📱 MercadoPago</option>
              </select>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Notas (opcional)</label>
              <input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Ej: Pagó parte en efectivo"
                style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px", outline: "none" }} />
            </div>
            <button onClick={handlePayment} disabled={paying || !payAmount || parseFloat(payAmount) <= 0}
              style={{ width: "100%", padding: "14px", background: paying ? "#A0AEC0" : "#2ECC71", color: "white", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "700", cursor: "pointer", minHeight: "48px" }}>
              {paying ? "⏳ Registrando..." : "✅ Confirmar pago"}
            </button>
          </div>
        </div>
      )}

      {/* Customer list */}
      {customerDebts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "#718096", background: "white", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
          <p style={{ fontWeight: "600", fontSize: "16px" }}>No hay deudas pendientes</p>
          <p style={{ fontSize: "14px", marginTop: "4px" }}>¡Todo el fiado está al día!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[...redCustomers, ...yellowCustomers, ...greenCustomers].map(customer => (
            <div key={customer.customerId} style={{ background: "white", borderRadius: "12px", padding: "16px", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                <div style={{ width: "44px", height: "44px", background: riskColors[customer.customerRiskLevel] + "20", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "700", color: riskColors[customer.customerRiskLevel], flexShrink: 0 }}>
                  {(customer.customerNickname || customer.customerName).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "#1A202C" }}>{customer.customerNickname || customer.customerName}</div>
                  <div style={{ fontSize: "12px", color: "#718096" }}>{customer.customerName} · {customer.count} deuda(s)</div>
                  <div style={{ fontSize: "11px", color: riskColors[customer.customerRiskLevel], fontWeight: "600" }}>{riskLabels[customer.customerRiskLevel]}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "22px", fontWeight: "900", color: riskColors[customer.customerRiskLevel] }}>{formatARS(customer.totalDebt)}</div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                {customer.customerPhone && (
                  <button onClick={() => generateWhatsApp(customer)}
                    style={{ padding: "8px 12px", background: "#25D366", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "700", minHeight: "40px" }}>
                    📱 WA
                  </button>
                )}
                <button onClick={() => { setPayingCustomer(customer); setPayAmount(""); }}
                  style={{ padding: "8px 12px", background: "#1E3A5F", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "700", minHeight: "40px" }}>
                  💰 Cobrar
                </button>
                <Link href={`/fiado/customers/${customer.customerId}`}
                  style={{ padding: "8px 12px", background: "#F7FAFC", color: "#1E3A5F", border: "1px solid #E2E8F0", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: "700", minHeight: "40px", display: "flex", alignItems: "center" }}>
                  Ver →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
