"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Supplier {
  id: string; name: string; contactName: string | null; phone: string | null;
  email: string | null; address: string | null; cuit: string | null; category: string | null;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", contactName: "", phone: "", email: "", address: "", cuit: "", category: "" });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const data = await fetch("/api/suppliers").then(r => r.json());
    setSuppliers(data.suppliers || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowForm(false); setForm({ name: "", contactName: "", phone: "", email: "", address: "", cuit: "", category: "" }); loadData(); }
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: "24px" }}>⏳ Cargando...</div>;

  const inputStyle = { width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px", outline: "none" };

  return (
    <div style={{ padding: "20px", maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <Link href="/purchases" style={{ color: "#1E3A5F", textDecoration: "none", fontSize: "22px" }}>←</Link>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F" }}>🏢 Proveedores</h1>
        <button onClick={() => setShowForm(true)} style={{ marginLeft: "auto", padding: "10px 16px", background: "#1E3A5F", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px", minHeight: "44px" }}>
          ➕ Nuevo
        </button>
      </div>

      {showForm && (
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "16px", border: "1px solid #E2E8F0" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>Nuevo proveedor</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Nombre del proveedor *" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <input style={inputStyle} value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Persona de contacto" />
                <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Teléfono" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" />
                <input style={inputStyle} value={form.cuit} onChange={e => setForm(f => ({ ...f, cuit: e.target.value }))} placeholder="CUIT" />
              </div>
              <input style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Categoría (Bebidas, Golosinas...)" />
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: "12px", background: "#1E3A5F", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px", minHeight: "48px" }}>
                  {saving ? "⏳ Guardando..." : "✅ Crear proveedor"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: "12px 20px", background: "white", color: "#718096", border: "1px solid #E2E8F0", borderRadius: "10px", cursor: "pointer", fontSize: "14px", minHeight: "48px" }}>Cancelar</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
        {suppliers.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#718096" }}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>🏢</div>
            <p style={{ fontWeight: "600" }}>No hay proveedores</p>
          </div>
        ) : (
          suppliers.map(s => (
            <div key={s.id} style={{ padding: "14px 20px", borderBottom: "1px solid #F7FAFC" }}>
              <div style={{ fontWeight: "700", color: "#1A202C", fontSize: "15px", marginBottom: "4px" }}>{s.name}</div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {s.contactName && <span style={{ fontSize: "13px", color: "#718096" }}>👤 {s.contactName}</span>}
                {s.phone && <span style={{ fontSize: "13px", color: "#718096" }}>📱 {s.phone}</span>}
                {s.category && <span style={{ fontSize: "11px", background: "#EBF4FF", color: "#1E3A5F", padding: "2px 8px", borderRadius: "20px" }}>{s.category}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
