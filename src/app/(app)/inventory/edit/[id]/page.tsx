"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { formatARS, calculateMargin, calculateSuggestedPrice } from "@/lib/utils";
import Link from "next/link";

interface Category { id: string; name: string; icon: string | null; }
interface Supplier { id: string; name: string; }

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targetMargin, setTargetMargin] = useState("30");
  const [form, setForm] = useState({
    name: "", description: "", barcode: "", sku: "",
    costPrice: "", salePrice: "", wholesalePrice: "",
    stock: "0", minStock: "5",
    unit: "unidad", allowFraction: false,
    categoryId: "", supplierId: "",
    expirationDate: "", batchNumber: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/products/${id}`).then(r => r.json()),
      fetch("/api/categories").then(r => r.json()),
      fetch("/api/suppliers").then(r => r.json()),
    ]).then(([prod, cats, sups]) => {
      if (prod.product) {
        const p = prod.product;
        setForm({
          name: p.name || "", description: p.description || "", barcode: p.barcode || "", sku: p.sku || "",
          costPrice: p.costPrice || "", salePrice: p.salePrice || "", wholesalePrice: p.wholesalePrice || "",
          stock: String(p.stock || 0), minStock: String(p.minStock || 5),
          unit: p.unit || "unidad", allowFraction: p.allowFraction || false,
          categoryId: p.categoryId || "", supplierId: p.supplierId || "",
          expirationDate: p.expirationDate ? p.expirationDate.split("T")[0] : "",
          batchNumber: p.batchNumber || "",
        });
      }
      setCategories(cats.categories || []);
      setSuppliers(sups.suppliers || []);
      setLoading(false);
    });
  }, [id]);

  const update = (key: string, value: string | boolean) => setForm(f => ({ ...f, [key]: value }));
  const margin = form.costPrice && form.salePrice ? calculateMargin(parseFloat(form.costPrice), parseFloat(form.salePrice)) : 0;
  const suggestedPrice = form.costPrice ? calculateSuggestedPrice(parseFloat(form.costPrice), parseFloat(targetMargin)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          barcode: form.barcode,
          sku: form.sku,
          costPrice: form.costPrice,
          salePrice: form.salePrice,
          wholesalePrice: form.wholesalePrice || null,
          stock: parseInt(form.stock) || 0,
          minStock: parseInt(form.minStock) || 5,
          unit: form.unit,
          allowFraction: form.allowFraction,
          categoryId: form.categoryId || null,
          supplierId: form.supplierId || null,
          expirationDate: form.expirationDate || null,
          batchNumber: form.batchNumber || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error); return; }
      router.push("/inventory");
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: "24px" }}>⏳ Cargando...</div>;

  const inputStyle = { width: "100%", padding: "10px 14px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "15px", outline: "none" };
  const labelStyle = { display: "block", fontWeight: "600", fontSize: "14px", color: "#1A202C", marginBottom: "6px" };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <Link href="/inventory" style={{ color: "#1E3A5F", textDecoration: "none", fontSize: "22px", minHeight: "36px", display: "flex", alignItems: "center" }}>←</Link>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F" }}>✏️ Editar producto</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "16px", border: "1px solid #E2E8F0" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#718096", marginBottom: "16px" }}>INFORMACIÓN BÁSICA</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Nombre del producto *</label>
              <input style={inputStyle} value={form.name} onChange={e => update("name", e.target.value)} required />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={labelStyle}>Código de barras</label><input style={inputStyle} value={form.barcode} onChange={e => update("barcode", e.target.value)} /></div>
              <div><label style={labelStyle}>SKU interno</label><input style={inputStyle} value={form.sku} onChange={e => update("sku", e.target.value)} /></div>
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
          </div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "16px", border: "1px solid #E2E8F0" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#718096", marginBottom: "16px" }}>PRECIOS</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={labelStyle}>Precio de costo *</label><input style={inputStyle} type="number" value={form.costPrice} onChange={e => update("costPrice", e.target.value)} required step="0.01" /></div>
              <div><label style={labelStyle}>Precio de venta *</label><input style={inputStyle} type="number" value={form.salePrice} onChange={e => update("salePrice", e.target.value)} required step="0.01" /></div>
            </div>
            {form.costPrice && form.salePrice && (
              <div style={{ background: margin > 30 ? "#F0FFF4" : margin > 15 ? "#FFFBEB" : "#FFF5F5", borderRadius: "10px", padding: "12px 16px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "600", fontSize: "14px" }}>Margen de ganancia:</span>
                <span style={{ fontWeight: "800", fontSize: "16px", color: margin > 30 ? "#2ECC71" : margin > 15 ? "#F39C12" : "#E74C3C" }}>{margin.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "16px", border: "1px solid #E2E8F0" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#718096", marginBottom: "16px" }}>STOCK</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={labelStyle}>Stock actual *</label><input style={inputStyle} type="number" value={form.stock} onChange={e => update("stock", e.target.value)} required /></div>
              <div><label style={labelStyle}>Stock mínimo</label><input style={inputStyle} type="number" value={form.minStock} onChange={e => update("minStock", e.target.value)} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={labelStyle}>Fecha de vencimiento</label><input style={inputStyle} type="date" value={form.expirationDate} onChange={e => update("expirationDate", e.target.value)} /></div>
              <div><label style={labelStyle}>Número de lote</label><input style={inputStyle} value={form.batchNumber} onChange={e => update("batchNumber", e.target.value)} /></div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="submit" disabled={saving}
            style={{ flex: 1, padding: "14px", background: saving ? "#A0AEC0" : "#1E3A5F", color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: saving ? "not-allowed" : "pointer", minHeight: "48px" }}>
            {saving ? "⏳ Guardando..." : "✅ Guardar cambios"}
          </button>
          <Link href="/inventory" style={{ padding: "14px 20px", background: "white", color: "#718096", border: "1px solid #E2E8F0", borderRadius: "10px", textDecoration: "none", fontWeight: "600", minHeight: "48px", display: "flex", alignItems: "center" }}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
