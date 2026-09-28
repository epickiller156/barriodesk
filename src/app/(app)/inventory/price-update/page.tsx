"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatARS, roundToNearest } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  costPrice: string;
  salePrice: string;
  categoryId: string | null;
}
interface Category { id: string; name: string; icon: string | null; }

export default function PriceUpdatePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateType, setUpdateType] = useState<"percentage" | "fixed">("percentage");
  const [updateValue, setUpdateValue] = useState("15");
  const [applyTo, setApplyTo] = useState<"salePrice" | "costPrice" | "both">("salePrice");
  const [roundTo, setRoundTo] = useState(50);
  const [showPreview, setShowPreview] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/products?limit=500").then(r => r.json()),
      fetch("/api/categories").then(r => r.json()),
    ]).then(([prods, cats]) => {
      setProducts(prods.products || []);
      setCategories(cats.categories || []);
      setLoading(false);
    });
  }, []);

  const filtered = products.filter(p => !categoryFilter || p.categoryId === categoryFilter);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  };

  const calcNewPrice = (oldPrice: string) => {
    let np = parseFloat(oldPrice);
    if (updateType === "percentage") np = np * (1 + parseFloat(updateValue || "0") / 100);
    else np = np + parseFloat(updateValue || "0");
    if (roundTo > 1) np = roundToNearest(np, roundTo);
    return Math.max(0, np);
  };

  const handleUpdate = async () => {
    if (selected.size === 0) { alert("Seleccioná al menos un producto"); return; }
    if (!updateValue || parseFloat(updateValue) === 0) { alert("Ingresá un valor de actualización"); return; }
    if (!confirm(`¿Actualizar el precio de ${selected.size} producto(s)?`)) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/products/price-bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: Array.from(selected),
          type: updateType,
          value: parseFloat(updateValue),
          applyTo,
          roundTo,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`✅ Se actualizaron ${data.updated} productos correctamente`);
        setSelected(new Set());
        // Refresh
        const prods = await fetch("/api/products?limit=500").then(r => r.json());
        setProducts(prods.products || []);
        setTimeout(() => setSuccess(""), 5000);
      }
    } finally { setUpdating(false); }
  };

  if (loading) return <div style={{ padding: "24px" }}>⏳ Cargando...</div>;

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <Link href="/inventory" style={{ color: "#1E3A5F", textDecoration: "none", fontSize: "22px" }}>←</Link>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F" }}>💲 Actualización masiva de precios</h1>
      </div>

      {success && <div style={{ background: "#F0FFF4", border: "1px solid #9AE6B4", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", color: "#2D6A4F", fontWeight: "600" }}>{success}</div>}

      {/* Update panel */}
      <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "16px", border: "1px solid #E2E8F0" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#718096", marginBottom: "16px" }}>CONFIGURAR ACTUALIZACIÓN</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Tipo</label>
            <select value={updateType} onChange={e => setUpdateType(e.target.value as "percentage" | "fixed")}
              style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px" }}>
              <option value="percentage">Porcentaje (%)</option>
              <option value="fixed">Monto fijo ($)</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Valor {updateType === "percentage" ? "(%)" : "($)"}</label>
            <input type="number" value={updateValue} onChange={e => setUpdateValue(e.target.value)} step="0.1"
              style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px", outline: "none" }} />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Aplicar a</label>
            <select value={applyTo} onChange={e => setApplyTo(e.target.value as "salePrice" | "costPrice" | "both")}
              style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px" }}>
              <option value="salePrice">Precio de venta</option>
              <option value="costPrice">Precio de costo</option>
              <option value="both">Ambos</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Redondear a</label>
            <select value={roundTo} onChange={e => setRoundTo(parseInt(e.target.value))}
              style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px" }}>
              <option value="1">Sin redondeo</option>
              <option value="10">$10</option>
              <option value="50">$50</option>
              <option value="100">$100</option>
              <option value="500">$500</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button onClick={() => setShowPreview(!showPreview)}
            style={{ padding: "10px 16px", background: "#EBF4FF", color: "#1E3A5F", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px", minHeight: "44px" }}>
            {showPreview ? "Ocultar preview" : "👁️ Ver preview"}
          </button>
          <button onClick={handleUpdate} disabled={updating || selected.size === 0}
            style={{ flex: 1, padding: "10px 16px", background: selected.size === 0 ? "#A0AEC0" : "#F5A623", color: "white", border: "none", borderRadius: "10px", cursor: selected.size === 0 ? "not-allowed" : "pointer", fontWeight: "700", fontSize: "14px", minHeight: "44px" }}>
            {updating ? "⏳ Actualizando..." : `✅ Actualizar ${selected.size} producto(s)`}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: "10px 14px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px" }}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <button onClick={toggleAll}
          style={{ padding: "10px 16px", background: selected.size === filtered.length ? "#1E3A5F" : "#F7FAFC", color: selected.size === filtered.length ? "white" : "#4A5568", border: "1px solid #E2E8F0", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px", minHeight: "44px" }}>
          {selected.size === filtered.length ? "✓ Deseleccionar todos" : "Seleccionar todos"}
        </button>
        <span style={{ padding: "10px 0", color: "#718096", fontSize: "14px", display: "flex", alignItems: "center" }}>
          {selected.size} seleccionados de {filtered.length}
        </span>
      </div>

      {/* Products table */}
      <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 110px 110px 110px", gap: "8px", padding: "12px 16px", background: "#F7FAFC", fontSize: "12px", fontWeight: "700", color: "#718096" }}>
          <span />
          <span>Producto</span>
          <span style={{ textAlign: "right" }}>Costo actual</span>
          <span style={{ textAlign: "right" }}>Precio actual</span>
          {showPreview && <span style={{ textAlign: "right" }}>Precio nuevo</span>}
        </div>
        {filtered.map(p => {
          const isSelected = selected.has(p.id);
          const newPrice = calcNewPrice(applyTo === "costPrice" ? p.costPrice : p.salePrice);
          const cat = p.categoryId ? catMap[p.categoryId] : null;
          return (
            <div key={p.id} onClick={() => toggleSelect(p.id)}
              style={{ display: "grid", gridTemplateColumns: "40px 1fr 110px 110px 110px", gap: "8px", padding: "10px 16px", borderBottom: "1px solid #F7FAFC", alignItems: "center", cursor: "pointer", background: isSelected ? "#EBF4FF" : "white", transition: "background 0.15s" }}>
              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)} style={{ width: "18px", height: "18px" }} />
              <div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>{p.name}</div>
                {cat && <div style={{ fontSize: "11px", color: "#718096" }}>{cat.icon} {cat.name}</div>}
              </div>
              <div style={{ textAlign: "right", fontSize: "13px", color: "#718096" }}>{formatARS(p.costPrice)}</div>
              <div style={{ textAlign: "right", fontWeight: "700", color: "#1E3A5F" }}>{formatARS(p.salePrice)}</div>
              {showPreview && (
                <div style={{ textAlign: "right", fontWeight: "700", color: "#2ECC71" }}>
                  {isSelected ? formatARS(newPrice) : "-"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
