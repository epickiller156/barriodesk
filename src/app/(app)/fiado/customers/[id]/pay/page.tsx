"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatARS } from "@/lib/utils";

interface Customer {
  id: string; name: string; nickname: string | null; phone: string | null; totalDebt: string;
}

export default function PayFiadoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: "", paymentMethod: "CASH", notes: "" });

  useEffect(() => {
    fetch(`/api/customers/${id}`).then(r => r.json()).then(d => {
      if (d.customer) { setCustomer(d.customer); setForm(f => ({ ...f, amount: d.customer.totalDebt })); }
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { alert("Ingresá un monto válido"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/fiado/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: id, amount: parseFloat(form.amount), paymentMethod: form.paymentMethod, notes: form.notes }),
      });
      if (res.ok) { alert("✅ Pago registrado"); router.push(`/fiado/customers/${id}`); }
      else { const d = await res.json(); alert(d.error); }
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: "24px" }}>⏳ Cargando...</div>;
  if (!customer) return <div style={{ padding: "24px" }}>Cliente no encontrado</div>;

  const inputStyle = { width: "100%", padding: "10px 14px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "15px", outline: "none" };

  return (
    <div style={{ padding: "20px", maxWidth: "480px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <Link href={`/fiado/customers/${id}`} style={{ color: "#1E3A5F", textDecoration: "none", fontSize: "22px" }}>←</Link>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F" }}>💰 Registrar pago</h1>
      </div>
      <div style={{ background: "#F7FAFC", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
        <div style={{ fontWeight: "700", fontSize: "16px" }}>{customer.nickname || customer.name}</div>
        <div style={{ color: "#718096" }}>Deuda total: <strong style={{ color: "#E74C3C" }}>{formatARS(customer.totalDebt)}</strong></div>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid #E2E8F0", marginBottom: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Monto del pago *</label>
              <input style={inputStyle} type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required step="0.01" min="0" />
              <button type="button" onClick={() => setForm(f => ({ ...f, amount: customer.totalDebt }))}
                style={{ marginTop: "8px", padding: "8px 14px", background: "#EBF4FF", color: "#1E3A5F", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", minHeight: "36px" }}>
                Pago total: {formatARS(customer.totalDebt)}
              </button>
            </div>
            <div>
              <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Método de pago</label>
              <select style={inputStyle} value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                <option value="CASH">💵 Efectivo</option>
                <option value="TRANSFER">🏦 Transferencia</option>
                <option value="MERCADOPAGO_QR">📱 MercadoPago</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Notas (opcional)</label>
              <input style={inputStyle} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ej: Pagó con transferencia" />
            </div>
          </div>
        </div>
        <button type="submit" disabled={saving}
          style={{ width: "100%", padding: "14px", background: saving ? "#A0AEC0" : "#2ECC71", color: "white", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "800", cursor: "pointer", minHeight: "52px" }}>
          {saving ? "⏳ Registrando..." : "✅ Confirmar pago"}
        </button>
      </form>
    </div>
  );
}
