"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatARS, formatDate, formatDateTime } from "@/lib/utils";

interface Purchase {
  id: string;
  purchaseNumber: number;
  supplierId: string | null;
  subtotal: string;
  total: string;
  paymentMethod: string;
  paymentStatus: string;
  invoiceNumber: string | null;
  notes: string | null;
  purchasedAt: string;
  createdAt: string;
}
interface Supplier { id: string; name: string; }
interface Product { id: string; name: string; costPrice: string; stock: number; }

const methodLabels: Record<string, string> = {
  CASH: "💵 Efectivo", TRANSFER: "🏦 Transferencia", MERCADOPAGO_QR: "📱 MP",
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ supplierId: "", paymentMethod: "CASH", invoiceNumber: "", notes: "", purchasedAt: new Date().toISOString().split("T")[0] });
  const [cartItems, setCartItems] = useState<{ product: Product; quantity: number; unitCost: number; updateCost: boolean }[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [purch, sup, prods] = await Promise.all([
      fetch("/api/purchases").then(r => r.json()),
      fetch("/api/suppliers").then(r => r.json()),
      fetch("/api/products?limit=500").then(r => r.json()),
    ]);
    setPurchases(purch.purchases || []);
    setSuppliers(sup.suppliers || []);
    setProducts(prods.products || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const addProduct = (product: Product) => {
    setCartItems(prev => {
      if (prev.find(i => i.product.id === product.id)) return prev;
      return [...prev, { product, quantity: 1, unitCost: parseFloat(product.costPrice), updateCost: false }];
    });
    setProductSearch("");
  };

  const total = cartItems.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const filteredProducts = productSearch
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) { alert("Agregá al menos un producto"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: form.supplierId || undefined,
          items: cartItems.map(i => ({ productId: i.product.id, quantity: i.quantity, unitCost: i.unitCost, updateCost: i.updateCost })),
          subtotal: total,
          total,
          paymentMethod: form.paymentMethod,
          invoiceNumber: form.invoiceNumber || undefined,
          notes: form.notes || undefined,
          purchasedAt: form.purchasedAt || undefined,
        }),
      });
      if (res.ok) {
        setShowNew(false);
        setCartItems([]);
        setForm({ supplierId: "", paymentMethod: "CASH", invoiceNumber: "", notes: "", purchasedAt: new Date().toISOString().split("T")[0] });
        loadData();
        alert("✅ Compra registrada y stock actualizado");
      }
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: "24px" }}>⏳ Cargando...</div>;
  const supMap = Object.fromEntries(suppliers.map(s => [s.id, s.name]));

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F" }}>🚚 Compras</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href="/purchases/suppliers" style={{ padding: "10px 14px", background: "white", color: "#1E3A5F", border: "1px solid #1E3A5F", borderRadius: "10px", textDecoration: "none", fontWeight: "600", fontSize: "14px", minHeight: "44px", display: "flex", alignItems: "center" }}>
            🏢 Proveedores
          </Link>
          <button onClick={() => setShowNew(true)} style={{ padding: "10px 16px", background: "#1E3A5F", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px", minHeight: "44px" }}>
            ➕ Nueva compra
          </button>
        </div>
      </div>

      {/* New purchase modal */}
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", overflowY: "auto" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1E3A5F" }}>🚚 Nueva compra</h2>
              <button onClick={() => setShowNew(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Proveedor</label>
                    <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}
                      style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px" }}>
                      <option value="">Sin proveedor</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Fecha de compra</label>
                    <input type="date" value={form.purchasedAt} onChange={e => setForm(f => ({ ...f, purchasedAt: e.target.value }))}
                      style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px" }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Método de pago</label>
                    <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                      style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px" }}>
                      <option value="CASH">Efectivo</option>
                      <option value="TRANSFER">Transferencia</option>
                      <option value="MERCADOPAGO_QR">MercadoPago</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Nro. factura proveedor</label>
                    <input value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="FC-001-00012345"
                      style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px", outline: "none" }} />
                  </div>
                </div>
              </div>

              {/* Product search */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Agregar productos</label>
                <div style={{ position: "relative" }}>
                  <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar producto..."
                    style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px", outline: "none" }} />
                  {filteredProducts.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #E2E8F0", borderRadius: "10px", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                      {filteredProducts.map(p => (
                        <button key={p.id} type="button" onClick={() => addProduct(p)}
                          style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontSize: "14px", borderBottom: "1px solid #F7FAFC", minHeight: "44px" }}>
                          {p.name} — Stock: {p.stock} — Costo: {formatARS(p.costPrice)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart */}
              {cartItems.map((item, idx) => (
                <div key={item.product.id} style={{ background: "#F7FAFC", borderRadius: "10px", padding: "12px", marginBottom: "8px" }}>
                  <div style={{ fontWeight: "600", fontSize: "14px", marginBottom: "8px" }}>{item.product.name}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px", alignItems: "center" }}>
                    <div>
                      <label style={{ fontSize: "12px", color: "#718096", display: "block", marginBottom: "2px" }}>Cantidad</label>
                      <input type="number" min="1" value={item.quantity} onChange={e => setCartItems(prev => prev.map((i, j) => j === idx ? { ...i, quantity: parseInt(e.target.value) || 1 } : i))}
                        style={{ width: "100%", padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "14px", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", color: "#718096", display: "block", marginBottom: "2px" }}>Costo unitario ($)</label>
                      <input type="number" min="0" step="0.01" value={item.unitCost} onChange={e => setCartItems(prev => prev.map((i, j) => j === idx ? { ...i, unitCost: parseFloat(e.target.value) || 0 } : i))}
                        style={{ width: "100%", padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "14px", outline: "none" }} />
                    </div>
                    <button type="button" onClick={() => setCartItems(prev => prev.filter((_, j) => j !== idx))}
                      style={{ padding: "6px 10px", background: "#FFF5F5", color: "#E74C3C", border: "none", borderRadius: "8px", cursor: "pointer", marginTop: "16px", minHeight: "36px" }}>🗑️</button>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", cursor: "pointer", fontSize: "13px" }}>
                    <input type="checkbox" checked={item.updateCost} onChange={e => setCartItems(prev => prev.map((i, j) => j === idx ? { ...i, updateCost: e.target.checked } : i))} />
                    Actualizar precio de costo del producto
                  </label>
                  <div style={{ textAlign: "right", fontWeight: "700", color: "#1E3A5F", marginTop: "6px" }}>Subtotal: {formatARS(item.quantity * item.unitCost)}</div>
                </div>
              ))}

              {cartItems.length > 0 && (
                <div style={{ background: "#F7FAFC", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "800", fontSize: "16px" }}>TOTAL:</span>
                  <span style={{ fontWeight: "800", fontSize: "18px", color: "#1E3A5F" }}>{formatARS(total)}</span>
                </div>
              )}

              <button type="submit" disabled={saving || cartItems.length === 0}
                style={{ width: "100%", padding: "14px", background: saving || cartItems.length === 0 ? "#A0AEC0" : "#1E3A5F", color: "white", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "700", cursor: "pointer", minHeight: "52px" }}>
                {saving ? "⏳ Registrando..." : "✅ Confirmar compra"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Purchases history */}
      <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
        {purchases.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#718096" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🚚</div>
            <p style={{ fontWeight: "600" }}>No hay compras registradas</p>
          </div>
        ) : (
          purchases.map(p => (
            <div key={p.id} style={{ padding: "14px 20px", borderBottom: "1px solid #F7FAFC", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <div style={{ fontWeight: "700", color: "#1A202C", fontSize: "15px" }}>
                  Compra #{p.purchaseNumber} {p.supplierId && supMap[p.supplierId] ? `— ${supMap[p.supplierId]}` : ""}
                </div>
                <div style={{ fontSize: "13px", color: "#718096" }}>
                  {formatDateTime(p.purchasedAt)} · {methodLabels[p.paymentMethod] || p.paymentMethod}
                  {p.invoiceNumber && ` · FC: ${p.invoiceNumber}`}
                </div>
              </div>
              <div style={{ fontWeight: "800", color: "#1E3A5F", fontSize: "18px" }}>{formatARS(p.total)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
