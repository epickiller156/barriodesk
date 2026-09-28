"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", nickname: "", phone: "", address: "", neighborhood: "", dni: "", creditLimit: "",
  });

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { alert("El nombre es obligatorio"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, creditLimit: form.creditLimit || undefined }),
      });
      if (res.ok) router.push("/fiado");
      else { const d = await res.json(); alert(d.error); }
    } finally { setLoading(false); }
  };

  const inputStyle = { width: "100%", padding: "10px 14px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "15px", outline: "none" };
  const labelStyle = { display: "block", fontWeight: "600", fontSize: "14px", color: "#1A202C", marginBottom: "6px" };

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <Link href="/fiado" style={{ color: "#1E3A5F", textDecoration: "none", fontSize: "22px" }}>←</Link>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F" }}>➕ Nuevo cliente</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "16px", border: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div><label style={labelStyle}>Nombre completo *</label><input style={inputStyle} value={form.name} onChange={e => update("name", e.target.value)} required placeholder="Rosa Gómez" /></div>
            <div><label style={labelStyle}>Apodo del barrio</label><input style={inputStyle} value={form.nickname} onChange={e => update("nickname", e.target.value)} placeholder="Doña Rosa" /></div>
            <div><label style={labelStyle}>Teléfono (WhatsApp)</label><input style={inputStyle} value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="381 456 7890" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={labelStyle}>Dirección</label><input style={inputStyle} value={form.address} onChange={e => update("address", e.target.value)} placeholder="Sarmiento 1245" /></div>
              <div><label style={labelStyle}>Barrio</label><input style={inputStyle} value={form.neighborhood} onChange={e => update("neighborhood", e.target.value)} placeholder="Alberdi" /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={labelStyle}>DNI</label><input style={inputStyle} value={form.dni} onChange={e => update("dni", e.target.value)} placeholder="28.456.789" /></div>
              <div><label style={labelStyle}>Límite de crédito ($)</label><input style={inputStyle} type="number" value={form.creditLimit} onChange={e => update("creditLimit", e.target.value)} placeholder="5000" /></div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="submit" disabled={loading}
            style={{ flex: 1, padding: "14px", background: loading ? "#A0AEC0" : "#1E3A5F", color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer", minHeight: "48px" }}>
            {loading ? "⏳ Guardando..." : "✅ Crear cliente"}
          </button>
          <Link href="/fiado" style={{ padding: "14px 20px", background: "white", color: "#718096", border: "1px solid #E2E8F0", borderRadius: "10px", textDecoration: "none", fontWeight: "600", minHeight: "48px", display: "flex", alignItems: "center" }}>Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
