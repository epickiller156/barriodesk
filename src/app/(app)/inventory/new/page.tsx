"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatARS, calculateMargin, calculateSuggestedPrice } from "@/lib/utils";
import Link from "next/link";

interface Category { id: string; name: string; icon: string | null; }
interface Supplier { id: string; name: string; }

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [targetMargin, setTargetMargin] = useState("30");
  const [form, setForm] = useState({
    name: "", description: "", barcode: "", sku: "",
    costPrice: "", salePrice: "",
    stock: "0", minStock: "5",
    unit: "unidad",
    allowFraction: false,
    categoryId: "", supplierId: "",
    expirationDate: "", batchNumber: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then(r => r.json()),
      fetch("/api/suppliers").then(r => r.json()),
    ]).then(([cats, sups]) => {
      setCategories(cats.categories || []);
      setSuppliers(sups.suppliers || []);
    });
  }, []);

  const update = (key: string, value: string | boolean) => setForm(f => ({ ...f, [key]: value }));

  const margin = form.costPrice && form.salePrice
    ? calculateMargin(parseFloat(form.costPrice), parseFloat(form.salePrice))
    : 0;

  const suggestedPrice = form.costPrice
    ? calculateSuggestedPrice(parseFloat(form.costPrice), parseFloat(targetMargin))
    : 0;

  const handleSubmit = async (e: React.FormEvent, andNew = false) => {
    e.preventDefault();
    if (!form.name || !form.costPrice || !form.salePrice) {
      alert("Completá los campos obligatorios: nombre, costo y precio de venta");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          stock: parseInt(form.stock) || 0,
          minStock: parseInt(form.minStock) || 5,
          categoryId: form.categoryId || undefined,
          supplierId: form.supplierId || undefined,
          expirationDate: form.expirationDate || undefined,
          batchNumber: form.batchNumber || undefined,
          barcode: form.barcode || undefined,
          sku: form.sku || undefined,
          description: form.description || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error); return; }
      if (andNew) {
        setForm({ name: "", description: "", barcode: "", sku: "", costPrice: "", salePrice: "", stock: "0", minStock: "5", unit: "unidad", allowFraction: false, categoryId: "", supplierId: "", expirationDate: "", batchNumber: "" });
      } else {
        router.push("/inventory");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: "100%", padding: "10px 14px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "15px", outline: "none" };
  const labelStyle = { display: "block", fontWeight: "600", fontSize: "14px", color: "#1A202C", marginBottom: "6px" };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <Link href="/inventory" style={{ color: "#1E3A5F", textDecoration: "none", fontSize: "22px", minHeight: "36px", display: "flex", alignItems: "center" }}>←</Link>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F" }}>➕ Nuevo producto</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic info */}
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "16px", border: "1px solid #E2E8F0" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#718096", marginBottom: "16px" }}>INFORMACIÓN BÁSICA</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Nombre del producto *</label>
              <input style={inputStyle} value={form.name} onChange={e => update("name", e.target.value)} required placeholder="Ej: Coca-Cola 500ml" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Código de barras</label>
                <input style={inputStyle} value={form.barcode} onChange={e => update("barcode", e.target.value)} placeholder="7790895000107" />
              </div>
              <div>
                <label style={labelStyle}>SKU interno</label>
                <input style={inputStyle} value={form.sku} onChange={e => update("sku", e.target.value)} placeholder="Auto" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Categoría</label>
                <select style={inputStyle} value={form.categoryId} onChange={e => update("categoryId", e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Proveedor</label>
                <select style={inputStyle} value={form.supplierId} onChange={e => update("supplierId", e.target.value)}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Unidad de venta</label>
                <select style={inputStyle} value={form.unit} onChange={e => update("unit", e.target.value)}>
                  <option value="unidad">Unidad</option>
                  <option value="kg">Kilogramo</option>
                  <option value="gr">Gramo</option>
                  <option value="litro">Litro</option>
                  <option value="docena">Docena</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", paddingTop: "22px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
                  <input type="checkbox" checked={form.allowFraction} onChange={e => update("allowFraction", e.target.checked)} style={{ width: "18px", height: "18px" }} />
                  Permite fracción
                </label>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Descripción</label>
              <textarea style={{ ...inputStyle, resize: "vertical" as "vertical", minHeight: "80px" }} value={form.description} onChange={e => update("description", e.target.value)} placeholder="Descripción opcional..." />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "16px", border: "1px solid #E2E8F0" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#718096", marginBottom: "16px" }}>PRECIOS Y MÁRGENES</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Precio de costo *</label>
                <input style={inputStyle} type="number" value={form.costPrice} onChange={e => update("costPrice", e.target.value)} required placeholder="0" min="0" step="0.01" />
              </div>
              <div>
                <label style={labelStyle}>Precio de venta *</label>
                <input style={inputStyle} type="number" value={form.salePrice} onChange={e => update("salePrice", e.target.value)} required placeholder="0" min="0" step="0.01" />
              </div>
            </div>
            {form.costPrice && form.salePrice && (
              <div style={{ background: margin > 30 ? "#F0FFF4" : margin > 15 ? "#FFFBEB" : "#FFF5F5", borderRadius: "10px", padding: "12px 16px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "600", fontSize: "14px" }}>Margen de ganancia:</span>
                <span style={{ fontWeight: "800", fontSize: "16px", color: margin > 30 ? "#2ECC71" : margin > 15 ? "#F39C12" : "#E74C3C" }}>{margin.toFixed(1)}%</span>
              </div>
            )}
            <div style={{ background: "#F7FAFC", borderRadius: "10px", padding: "12px 16px" }}>
              <div style={{ fontWeight: "600", fontSize: "14px", marginBottom: "8px" }}>💡 Calculadora de precio sugerido</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#718096" }}>Si quiero ganar el</span>
                <input type="number" value={targetMargin} onChange={e => setTargetMargin(e.target.value)} style={{ width: "60px", padding: "6px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "14px", outline: "none", textAlign: "center" }} />
                <span style={{ fontSize: "13px", color: "#718096" }}>%, debo vender a</span>
                <span style={{ fontWeight: "700", color: "#1E3A5F" }}>{form.costPrice ? formatARS(suggestedPrice) : "-"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stock */}
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "16px", border: "1px solid #E2E8F0" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#718096", marginBottom: "16px" }}>STOCK</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Stock actual *</label>
                <input style={inputStyle} type="number" value={form.stock} onChange={e => update("stock", e.target.value)} required min="0" />
              </div>
              <div>
                <label style={labelStyle}>Stock mínimo</label>
                <input style={inputStyle} type="number" value={form.minStock} onChange={e => update("minStock", e.target.value)} min="0" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Fecha de vencimiento</label>
                <input style={inputStyle} type="date" value={form.expirationDate} onChange={e => update("expirationDate", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Número de lote</label>
                <input style={inputStyle} value={form.batchNumber} onChange={e => update("batchNumber", e.target.value)} placeholder="LOT-001" />
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button type="submit" disabled={loading}
            style={{ flex: 1, padding: "14px", background: loading ? "#A0AEC0" : "#1E3A5F", color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", minHeight: "48px" }}>
            {loading ? "⏳ Guardando..." : "✅ Guardar producto"}
          </button>
          <button type="button" onClick={e => handleSubmit(e as React.MouseEvent<HTMLButtonElement> & React.FormEvent, true)} disabled={loading}
            style={{ padding: "14px 16px", background: "white", color: "#1E3A5F", border: "2px solid #1E3A5F", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", minHeight: "48px" }}>
            Guardar y agregar otro
          </button>
          <Link href="/inventory" style={{ padding: "14px 16px", background: "white", color: "#718096", border: "1px solid #E2E8F0", borderRadius: "10px", fontSize: "14px", fontWeight: "600", textDecoration: "none", minHeight: "48px", display: "flex", alignItems: "center" }}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
