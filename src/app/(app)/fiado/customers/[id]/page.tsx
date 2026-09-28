"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatARS, formatDateTime, generateWhatsAppUrl, getDaysSince } from "@/lib/utils";

interface Customer {
  id: string; name: string; nickname: string | null; phone: string | null;
  address: string | null; neighborhood: string | null; creditLimit: string | null;
  totalDebt: string; riskLevel: string; createdAt: string;
}
interface FiadoRecord {
  id: string; amount: string; paidAmount: string; remainingAmount: string;
  status: string; dueDate: string | null; createdAt: string; saleId: string;
}
interface Payment {
  id: string; amount: string; paymentMethod: string; notes: string | null; createdAt: string;
}

const riskColors: Record<string, string> = { GREEN: "#2ECC71", YELLOW: "#F39C12", RED: "#E74C3C" };
const riskLabels: Record<string, string> = { GREEN: "Al día", YELLOW: "Atrasado", RED: "Riesgo alto" };
const statusColors: Record<string, string> = { PENDING: "#F39C12", PARTIAL: "#3498DB", PAID: "#2ECC71", OVERDUE: "#E74C3C", WRITTEN_OFF: "#718096" };
const statusLabels: Record<string, string> = { PENDING: "Pendiente", PARTIAL: "Pago parcial", PAID: "Pagado", OVERDUE: "Vencido", WRITTEN_OFF: "Incobrable" };
const methodLabels: Record<string, string> = { CASH: "Efectivo", TRANSFER: "Transferencia", MERCADOPAGO_QR: "MercadoPago", DEBIT_CARD: "Débito", CREDIT_CARD: "Crédito" };

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [fiados, setFiados] = useState<FiadoRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState("el local");
  const [storeCbuAlias, setStoreCbuAlias] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/customers/${id}`).then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json()),
    ]).then(([custData, meData]) => {
      if (custData.customer) setCustomer(custData.customer);
      if (custData.fiadoRecords) setFiados(custData.fiadoRecords);
      if (custData.payments) setPayments(custData.payments);
      if (meData.store) setStoreName(meData.store.name);
      setLoading(false);
    });
  }, [id]);

  const sendWhatsApp = () => {
    if (!customer?.phone) { alert("El cliente no tiene teléfono registrado"); return; }
    const pendingFiados = fiados.filter(f => f.status !== "PAID" && f.status !== "WRITTEN_OFF");
    const detailLines = pendingFiados.map(f => `• ${formatDateTime(f.createdAt)}: ${formatARS(f.remainingAmount)} pendiente`).join("\n");
    const msg = `Hola ${customer.nickname || customer.name} 👋\n\nTe mandamos tu resumen de cuenta de ${storeName}:\n\n📋 *Detalle de deuda:*\n${detailLines}\n\n💰 *Total pendiente: ${formatARS(customer.totalDebt)}*\n\n${storeCbuAlias ? `Podés pagarlo por transferencia al alias:\n🏦 ${storeCbuAlias}\n\n` : ""}¡Gracias por confiar en nosotros! 🙌\n${storeName}`;
    window.open(generateWhatsAppUrl(customer.phone, msg), "_blank");
  };

  if (loading) return <div style={{ padding: "24px" }}>⏳ Cargando...</div>;
  if (!customer) return <div style={{ padding: "24px" }}>Cliente no encontrado</div>;

  const creditLimit = customer.creditLimit ? parseFloat(customer.creditLimit) : null;
  const totalDebt = parseFloat(customer.totalDebt);
  const debtPercent = creditLimit && creditLimit > 0 ? Math.min(100, (totalDebt / creditLimit) * 100) : 0;
  const pendingFiados = fiados.filter(f => f.status !== "PAID" && f.status !== "WRITTEN_OFF");

  return (
    <div style={{ padding: "20px", maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <Link href="/fiado" style={{ color: "#1E3A5F", textDecoration: "none", fontSize: "22px" }}>←</Link>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F" }}>👤 Perfil del cliente</h1>
      </div>

      {/* Customer header */}
      <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "16px", border: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <div style={{ width: "60px", height: "60px", background: riskColors[customer.riskLevel] + "20", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "800", color: riskColors[customer.riskLevel], flexShrink: 0 }}>
            {(customer.nickname || customer.name).charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "800", fontSize: "18px", color: "#1A202C" }}>{customer.nickname || customer.name}</div>
            {customer.nickname && <div style={{ color: "#718096", fontSize: "14px" }}>{customer.name}</div>}
            <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
              <span style={{ background: riskColors[customer.riskLevel] + "20", color: riskColors[customer.riskLevel], fontWeight: "700", fontSize: "12px", padding: "3px 10px", borderRadius: "20px" }}>
                {riskLabels[customer.riskLevel]}
              </span>
              {customer.neighborhood && <span style={{ background: "#EBF4FF", color: "#1E3A5F", fontSize: "12px", padding: "3px 10px", borderRadius: "20px" }}>{customer.neighborhood}</span>}
            </div>
            {customer.phone && <div style={{ marginTop: "8px", fontSize: "14px", color: "#4A5568" }}>📱 {customer.phone}</div>}
            {customer.address && <div style={{ fontSize: "14px", color: "#4A5568" }}>📍 {customer.address}</div>}
          </div>
        </div>

        {/* Debt vs limit */}
        <div style={{ marginTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "13px", color: "#718096" }}>Deuda total</span>
            <span style={{ fontSize: "13px", color: "#718096" }}>{creditLimit ? `Límite: ${formatARS(creditLimit)}` : "Sin límite"}</span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: riskColors[customer.riskLevel], marginBottom: "8px" }}>{formatARS(totalDebt)}</div>
          {creditLimit && (
            <div style={{ background: "#E2E8F0", borderRadius: "20px", height: "8px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${debtPercent}%`, background: debtPercent > 80 ? "#E74C3C" : debtPercent > 50 ? "#F39C12" : "#2ECC71", borderRadius: "20px", transition: "width 0.3s" }} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
          <button onClick={sendWhatsApp}
            style={{ padding: "10px 16px", background: "#25D366", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px", minHeight: "44px" }}>
            💬 Recordatorio WhatsApp
          </button>
          <Link href={`/fiado/customers/${id}/pay`}
            style={{ padding: "10px 16px", background: "#1E3A5F", color: "white", borderRadius: "10px", textDecoration: "none", fontWeight: "700", fontSize: "14px", minHeight: "44px", display: "flex", alignItems: "center" }}>
            💰 Registrar pago
          </Link>
        </div>
      </div>

      {/* Active fiados */}
      <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "16px", border: "1px solid #E2E8F0" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1A202C", marginBottom: "16px" }}>📋 Deudas activas ({pendingFiados.length})</h2>
        {pendingFiados.length === 0 ? (
          <p style={{ color: "#718096", fontSize: "14px", textAlign: "center", padding: "16px" }}>✅ Sin deudas pendientes</p>
        ) : (
          pendingFiados.map(f => (
            <div key={f.id} style={{ padding: "12px", background: "#F7FAFC", borderRadius: "10px", marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ background: statusColors[f.status] + "20", color: statusColors[f.status], fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px" }}>{statusLabels[f.status]}</span>
                  <div style={{ marginTop: "6px", fontSize: "13px", color: "#718096" }}>Creado: {formatDateTime(f.createdAt)}</div>
                  {f.dueDate && <div style={{ fontSize: "13px", color: getDaysSince(f.dueDate) > 0 ? "#E74C3C" : "#718096" }}>Vence: {formatDateTime(f.dueDate)}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#E74C3C" }}>{formatARS(f.remainingAmount)}</div>
                  <div style={{ fontSize: "12px", color: "#718096" }}>de {formatARS(f.amount)}</div>
                  <div style={{ fontSize: "12px", color: "#2ECC71" }}>Pagado: {formatARS(f.paidAmount)}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid #E2E8F0" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1A202C", marginBottom: "16px" }}>🕐 Historial de pagos</h2>
          {payments.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F7FAFC" }}>
              <div>
                <div style={{ fontWeight: "600", fontSize: "14px", color: "#2ECC71" }}>+{formatARS(p.amount)}</div>
                <div style={{ fontSize: "12px", color: "#718096" }}>{methodLabels[p.paymentMethod] || p.paymentMethod} · {formatDateTime(p.createdAt)}</div>
                {p.notes && <div style={{ fontSize: "12px", color: "#718096" }}>{p.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
