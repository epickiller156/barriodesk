"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatARS, formatDate, getDaysUntil, calculateMargin } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  costPrice: string;
  salePrice: string;
  stock: number;
  minStock: number;
  categoryId: string | null;
  supplierId: string | null;
  isActive: boolean;
  expirationDate: string | null;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

function InventoryContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("stock") === "low") setStockFilter("low");
    if (searchParams.get("expiring") === "true") setStockFilter("expiring");
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    const [prods, cats] = await Promise.all([
      fetch("/api/products?limit=500").then(r => r.json()),
      fetch("/api/categories").then(r => r.json()),
    ]);
    setProducts(prods.products || []);
    setCategories(cats.categories || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
    const matchCat = !categoryFilter || p.categoryId === categoryFilter;
    const matchStock = !stockFilter ? true :
      stockFilter === "low" ? (p.stock <= p.minStock && p.stock > 0) :
      stockFilter === "out" ? p.stock <= 0 :
      stockFilter === "expiring" ? (p.expirationDate && getDaysUntil(p.expirationDate) <= 15) : true;
    return matchSearch && matchCat && matchStock;
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Dar de baja "${name}"?`)) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    loadData();
  };

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

  if (loading) {
    return <div style={{ padding: "24px" }}>{[1,2,3,4,5].map(i => <div key={i} style={{ height: "60px", marginBottom: "8px" }} className="skeleton" />)}</div>;
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F" }}>📦 Inventario</h1>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link href="/inventory/price-update" style={{ padding: "10px 16px", background: "#F5A623", color: "white", borderRadius: "10px", textDecoration: "none", fontWeight: "700", fontSize: "14px", minHeight: "44px", display: "flex", alignItems: "center" }}>
            💲 Actualizar precios
          </Link>
          <Link href="/inventory/new" style={{ padding: "10px 16px", background: "#1E3A5F", color: "white", borderRadius: "10px", textDecoration: "none", fontWeight: "700", fontSize: "14px", minHeight: "44px", display: "flex", alignItems: "center" }}>
            ➕ Nuevo producto
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "20px" }}>
        {[
          { label: "Total productos", value: products.length, color: "#1E3A5F" },
          { label: "Stock bajo", value: products.filter(p => p.stock <= p.minStock && p.stock > 0).length, color: "#F39C12" },
          { label: "Sin stock", value: products.filter(p => p.stock <= 0).length, color: "#E74C3C" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "white", borderRadius: "10px", padding: "14px", textAlign: "center", border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: "24px", fontWeight: "800", color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: "12px", color: "#718096" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: "white", borderRadius: "12px", padding: "16px", marginBottom: "16px", border: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar por nombre o código..."
            style={{ flex: 1, minWidth: "200px", padding: "10px 14px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px", outline: "none" }}
          />
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            style={{ padding: "10px 14px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px", outline: "none" }}>
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select value={stockFilter} onChange={e => setStockFilter(e.target.value)}
            style={{ padding: "10px 14px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px", outline: "none" }}>
            <option value="">Todo el stock</option>
            <option value="low">Stock bajo</option>
            <option value="out">Sin stock</option>
            <option value="expiring">Por vencer (&lt;15 días)</option>
          </select>
        </div>
      </div>

      {/* Products list */}
      <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 100px 80px 80px", gap: "8px", padding: "12px 16px", background: "#F7FAFC", borderBottom: "1px solid #E2E8F0", fontSize: "12px", fontWeight: "700", color: "#718096" }}>
          <span>Producto</span><span style={{ textAlign: "center" }}>Stock</span><span style={{ textAlign: "right" }}>Costo</span><span style={{ textAlign: "right" }}>Precio</span><span style={{ textAlign: "center" }}>Margen</span><span style={{ textAlign: "center" }}>Acciones</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#718096" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📦</div>
            <p style={{ fontWeight: "600", marginBottom: "8px" }}>No hay productos</p>
            <Link href="/inventory/new" style={{ color: "#1E3A5F", fontWeight: "600" }}>➕ Agregar el primer producto</Link>
          </div>
        ) : (
          filtered.map(product => {
            const margin = calculateMargin(parseFloat(product.costPrice), parseFloat(product.salePrice));
            const stockColor = product.stock <= 0 ? "#E74C3C" : product.stock <= product.minStock ? "#F39C12" : "#2ECC71";
            const days = product.expirationDate ? getDaysUntil(product.expirationDate) : null;
            const cat = product.categoryId ? catMap[product.categoryId] : null;

            return (
              <div key={product.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 100px 80px 80px", gap: "8px", padding: "12px 16px", borderBottom: "1px solid #F7FAFC", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "14px", color: "#1A202C" }}>{product.name}</div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
                    {cat && <span style={{ fontSize: "11px", color: "#718096" }}>{cat.icon} {cat.name}</span>}
                    {product.barcode && <span style={{ fontSize: "11px", color: "#A0AEC0" }}>🔖 {product.barcode}</span>}
                    {days !== null && (
                      <span style={{ fontSize: "11px", fontWeight: "700", color: days <= 5 ? "#E74C3C" : days <= 15 ? "#F39C12" : "#2ECC71", background: days <= 5 ? "#FFF5F5" : days <= 15 ? "#FFFBEB" : "#F0FFF4", padding: "1px 6px", borderRadius: "8px" }}>
                        {days <= 0 ? "Vencido" : `Vence en ${days}d`}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontWeight: "700", color: stockColor, fontSize: "15px" }}>{product.stock}</span>
                </div>
                <div style={{ textAlign: "right", fontSize: "13px", color: "#718096" }}>{formatARS(product.costPrice)}</div>
                <div style={{ textAlign: "right", fontWeight: "700", color: "#1E3A5F" }}>{formatARS(product.salePrice)}</div>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: margin > 30 ? "#2ECC71" : margin > 15 ? "#F39C12" : "#E74C3C" }}>{margin.toFixed(1)}%</span>
                </div>
                <div style={{ textAlign: "center", display: "flex", gap: "4px", justifyContent: "center" }}>
                  <Link href={`/inventory/edit/${product.id}`} style={{ padding: "6px 8px", background: "#EBF4FF", color: "#1E3A5F", borderRadius: "6px", textDecoration: "none", fontSize: "14px", minHeight: "30px", display: "flex", alignItems: "center" }}>✏️</Link>
                  <button onClick={() => handleDelete(product.id, product.name)} style={{ padding: "6px 8px", background: "#FFF5F5", color: "#E74C3C", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", minHeight: "30px" }}>🗑️</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: "8px", color: "#718096", fontSize: "13px", textAlign: "right" }}>
        Mostrando {filtered.length} de {products.length} productos
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div style={{ padding: "24px" }}>⏳ Cargando...</div>}>
      <InventoryContent />
    </Suspense>
  );
}
