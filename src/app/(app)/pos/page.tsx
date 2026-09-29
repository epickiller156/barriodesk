"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { formatARS } from "@/lib/utils";
import { useOfflineSync } from "@/hooks/useOfflineSync";

interface Product {
  id: string;
  name: string;
  salePrice: string;
  costPrice: string;
  stock: number;
  categoryId: string | null;
  imageUrl: string | null;
  barcode: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  nickname: string | null;
  phone: string | null;
  totalDebt: string;
  riskLevel: string;
}

const paymentMethods = [
  { key: "CASH", label: "💵 Efectivo", color: "#2ECC71" },
  { key: "MERCADOPAGO_QR", label: "📱 MercadoPago", color: "#009EE3" },
  { key: "TRANSFER", label: "🏦 Transferencia", color: "#3498DB" },
  { key: "DEBIT_CARD", label: "💳 Débito", color: "#9B59B6" },
  { key: "CREDIT_CARD", label: "💳 Crédito", color: "#8E44AD" },
  { key: "FIADO", label: "📋 Fiado", color: "#F39C12" },
];

const riskColors: Record<string, string> = { GREEN: "#2ECC71", YELLOW: "#F39C12", RED: "#E74C3C" };

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [lastSale, setLastSale] = useState<{ id: string; total: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { addPendingSale, hasPending, isSyncing, pendingSales } = useOfflineSync();

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    const [prods, cats, custs] = await Promise.all([
      fetch("/api/products?limit=200").then(r => r.json()),
      fetch("/api/categories").then(r => r.json()),
      fetch("/api/customers").then(r => r.json()),
    ]);
    setProducts(prods.products || []);
    setCategories(cats.categories || []);
    setCustomers(custs.customers || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    if (product.stock <= 0) { showToast("Sin stock disponible", "error"); return; }
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { showToast("No hay más stock", "error"); return prev; }
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.product.id !== productId));
    } else {
      setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
    }
  };

  const cartSubtotal = cart.reduce((sum, i) => sum + parseFloat(i.product.salePrice) * i.quantity, 0);
  const discountAmount = discountType === "percent"
    ? cartSubtotal * (parseFloat(discount || "0") / 100)
    : parseFloat(discount || "0");
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);
  const change = parseFloat(cashReceived || "0") - cartTotal;

  const handleSale = async () => {
    if (cart.length === 0) { showToast("El carrito está vacío", "error"); return; }
    if (paymentMethod === "FIADO" && !selectedCustomer) { showToast("Seleccioná un cliente para el fiado", "error"); return; }
    setProcessing(true);
    const saleData = {
      items: cart.map(i => ({
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: parseFloat(i.product.salePrice),
        costPrice: parseFloat(i.product.costPrice),
        subtotal: parseFloat(i.product.salePrice) * i.quantity,
        discount: 0,
      })),
      subtotal: cartSubtotal,
      discountAmount,
      taxAmount: 0,
      total: cartTotal,
      paymentMethod,
      paymentStatus: "PAID",
      customerId: selectedCustomer?.id,
      isFiado: paymentMethod === "FIADO",
    };

    // Si no hay conexión, guardar en localStorage
    if (!navigator.onLine) {
      addPendingSale(saleData);
      setLastSale({ id: "offline", total: cartTotal });
      setSaleSuccess(true);
      setCart([]);
      setDiscount("");
      setCashReceived("");
      setSelectedCustomer(null);
      setShowCheckout(false);
      showToast("Venta guardada offline. Se sincronizará cuando haya conexión.", "success");
      setProcessing(false);
      return;
    }

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLastSale({ id: data.sale.id, total: cartTotal });
      setSaleSuccess(true);
      setCart([]);
      setDiscount("");
      setCashReceived("");
      setSelectedCustomer(null);
      setShowCheckout(false);
      loadData(); // refresh stock
    } catch (e) {
      // Si falla por red, guardar offline
      if ((e as Error).message.includes("fetch") || (e as Error).message.includes("network")) {
        addPendingSale(saleData);
        setLastSale({ id: "offline", total: cartTotal });
        setSaleSuccess(true);
        setCart([]);
        setDiscount("");
        setCashReceived("");
        setSelectedCustomer(null);
        setShowCheckout(false);
        showToast("Venta guardada offline. Se sincronizará cuando haya conexión.", "success");
      } else {
        showToast(`Error: ${(e as Error).message}`, "error");
      }
    } finally {
      setProcessing(false);
    }
  };

  const filteredCustomers = customerSearch
    ? customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.nickname && c.nickname.toLowerCase().includes(customerSearch.toLowerCase())))
    : customers.slice(0, 8);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh", fontSize: "18px", color: "#718096" }}>⏳ Cargando productos...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)", background: "#F8F9FA" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: "80px", left: "50%", transform: "translateX(-50%)", background: toast.type === "success" ? "#2ECC71" : "#E74C3C", color: "white", padding: "12px 20px", borderRadius: "12px", fontWeight: "700", zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", fontSize: "14px" }}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* Success modal */}
      {saleSuccess && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "32px", maxWidth: "360px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "60px", marginBottom: "16px" }}>🎉</div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#2ECC71", marginBottom: "8px" }}>¡Venta registrada!</h2>
            <p style={{ color: "#718096", marginBottom: "24px", fontSize: "16px" }}>Total: <strong style={{ color: "#1E3A5F" }}>{formatARS(lastSale?.total)}</strong></p>
            <button onClick={() => { setSaleSuccess(false); setPaymentMethod("CASH"); searchRef.current?.focus(); }}
              style={{ width: "100%", padding: "14px", background: "#1E3A5F", color: "white", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "700", cursor: "pointer", minHeight: "48px" }}>
              ➕ Nueva venta
            </button>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", padding: "24px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1E3A5F" }}>💳 Cobrar</h2>
              <button onClick={() => setShowCheckout(false)} style={{ background: "#F7FAFC", border: "none", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontSize: "16px" }}>✕</button>
            </div>

            {/* Total */}
            <div style={{ background: "#1E3A5F", borderRadius: "12px", padding: "20px", textAlign: "center", marginBottom: "20px" }}>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", marginBottom: "4px" }}>TOTAL A COBRAR</div>
              <div style={{ color: "white", fontSize: "40px", fontWeight: "900" }}>{formatARS(cartTotal)}</div>
              {discountAmount > 0 && <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", marginTop: "4px" }}>Descuento: {formatARS(discountAmount)}</div>}
            </div>

            {/* Payment methods */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: "700", marginBottom: "8px", color: "#1A202C" }}>Método de pago</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {paymentMethods.map(m => (
                  <button key={m.key} onClick={() => setPaymentMethod(m.key)}
                    style={{ padding: "10px 4px", border: `2px solid ${paymentMethod === m.key ? m.color : "#E2E8F0"}`, borderRadius: "10px", background: paymentMethod === m.key ? m.color + "15" : "white", cursor: "pointer", fontSize: "11px", fontWeight: paymentMethod === m.key ? "700" : "400", color: paymentMethod === m.key ? m.color : "#4A5568", transition: "all 0.2s", minHeight: "52px" }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash change calculator */}
            {paymentMethod === "CASH" && (
              <div style={{ marginBottom: "16px", background: "#F7FAFC", borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Monto recibido</div>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  placeholder="0"
                  style={{ width: "100%", padding: "12px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "18px", fontWeight: "700", textAlign: "center", outline: "none" }}
                />
                <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                  {[100, 200, 500, 1000, 2000, 5000].map(amt => (
                    <button key={amt} onClick={() => setCashReceived((parseFloat(cashReceived || "0") + amt).toString())}
                      style={{ padding: "6px 10px", background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", minHeight: "36px" }}>
                      +${amt.toLocaleString("es-AR")}
                    </button>
                  ))}
                  <button onClick={() => setCashReceived(cartTotal.toString())}
                    style={{ padding: "6px 10px", background: "#1E3A5F", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", minHeight: "36px" }}>
                    Exacto
                  </button>
                </div>
                {cashReceived && parseFloat(cashReceived) > 0 && (
                  <div style={{ marginTop: "12px", padding: "12px", background: change >= 0 ? "#F0FFF4" : "#FFF5F5", borderRadius: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "12px", color: "#718096" }}>Vuelto</div>
                    <div style={{ fontSize: "26px", fontWeight: "800", color: change >= 0 ? "#2ECC71" : "#E74C3C" }}>{formatARS(Math.abs(change))}</div>
                    {change < 0 && <div style={{ fontSize: "12px", color: "#E74C3C" }}>Faltan {formatARS(Math.abs(change))}</div>}
                  </div>
                )}
              </div>
            )}

            {/* Fiado - customer selection */}
            {paymentMethod === "FIADO" && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Cliente para el fiado</div>
                <input
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Buscar cliente..."
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px", outline: "none", marginBottom: "8px" }}
                />
                {!selectedCustomer ? (
                  <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid #E2E8F0", borderRadius: "10px" }}>
                    {filteredCustomers.map(c => (
                      <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); }}
                        style={{ width: "100%", padding: "10px 12px", background: "white", border: "none", borderBottom: "1px solid #F7FAFC", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", minHeight: "44px" }}>
                        <div>
                          <div style={{ fontWeight: "600", fontSize: "14px" }}>{c.nickname || c.name}</div>
                          <div style={{ fontSize: "12px", color: "#718096" }}>Deuda: {formatARS(c.totalDebt)}</div>
                        </div>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: riskColors[c.riskLevel], marginTop: "4px" }} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "12px", background: "#F7FAFC", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "700" }}>{selectedCustomer.nickname || selectedCustomer.name}</div>
                      <div style={{ fontSize: "12px", color: "#718096" }}>Deuda actual: {formatARS(selectedCustomer.totalDebt)}</div>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} style={{ background: "none", border: "none", color: "#E74C3C", cursor: "pointer", fontSize: "18px", minHeight: "36px" }}>✕</button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleSale}
              disabled={processing}
              style={{ width: "100%", padding: "18px", background: processing ? "#A0AEC0" : "#2ECC71", color: "white", border: "none", borderRadius: "12px", fontSize: "18px", fontWeight: "800", cursor: processing ? "not-allowed" : "pointer", minHeight: "56px" }}>
              {processing ? "⏳ Procesando..." : "✅ CONFIRMAR VENTA"}
            </button>
          </div>
        </div>
      )}

      {/* Pending sales indicator */}
      {hasPending && (
        <div style={{ background: "#FFFBEB", borderBottom: "1px solid #F59E0B", padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#92400E" }}>
            <span>📡</span>
            <span>{pendingSales.length} venta(s) pendiente(s) de sincronización</span>
          </div>
          {isSyncing && <span style={{ fontSize: "12px", color: "#92400E" }}>Sincronizando...</span>}
        </div>
      )}

      {/* Search and categories */}
      <div style={{ background: "white", padding: "12px 16px", borderBottom: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar producto o código de barras..."
            style={{ flex: 1, padding: "10px 14px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "15px", outline: "none" }}
            onFocus={e => e.target.style.borderColor = "#1E3A5F"}
            onBlur={e => e.target.style.borderColor = "#E2E8F0"}
          />
          {search && <button onClick={() => setSearch("")} style={{ padding: "10px 14px", background: "#F7FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", cursor: "pointer", fontSize: "16px", minHeight: "44px" }}>✕</button>}
        </div>
        {/* Category tabs */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          <button onClick={() => setSelectedCategory("")}
            style={{ padding: "6px 12px", borderRadius: "20px", border: "none", background: !selectedCategory ? "#1E3A5F" : "#F7FAFC", color: !selectedCategory ? "white" : "#4A5568", cursor: "pointer", fontSize: "13px", fontWeight: selectedCategory === "" ? "700" : "400", whiteSpace: "nowrap", minHeight: "36px" }}>
            Todos
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id === selectedCategory ? "" : cat.id)}
              style={{ padding: "6px 12px", borderRadius: "20px", border: "none", background: selectedCategory === cat.id ? "#1E3A5F" : "#F7FAFC", color: selectedCategory === cat.id ? "white" : "#4A5568", cursor: "pointer", fontSize: "13px", fontWeight: selectedCategory === cat.id ? "700" : "400", whiteSpace: "nowrap", minHeight: "36px" }}>
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Products grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "#718096" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔍</div>
              <p style={{ fontWeight: "600" }}>No encontramos productos</p>
              <p style={{ fontSize: "14px", marginTop: "4px" }}>Probá con otro nombre o código</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
              {filteredProducts.map(product => {
                const inCart = cart.find(i => i.product.id === product.id);
                const isLowStock = product.stock <= 5 && product.stock > 0;
                const isOutOfStock = product.stock <= 0;
                return (
                  <button key={product.id} onClick={() => addToCart(product)} disabled={isOutOfStock}
                    style={{ background: "white", border: `2px solid ${inCart ? "#1E3A5F" : "#E2E8F0"}`, borderRadius: "12px", padding: "12px 10px", cursor: isOutOfStock ? "not-allowed" : "pointer", textAlign: "center", opacity: isOutOfStock ? 0.5 : 1, position: "relative", transition: "all 0.15s", boxShadow: inCart ? "0 0 0 2px rgba(30,58,95,0.2)" : "none" }}>
                    {inCart && <span style={{ position: "absolute", top: "-8px", right: "-8px", background: "#1E3A5F", color: "white", width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800" }}>{inCart.quantity}</span>}
                    {isLowStock && !isOutOfStock && <span style={{ position: "absolute", top: "6px", left: "6px", background: "#F39C12", color: "white", fontSize: "9px", fontWeight: "700", padding: "1px 4px", borderRadius: "6px" }}>POCO</span>}
                    {isOutOfStock && <span style={{ position: "absolute", top: "6px", left: "6px", background: "#E74C3C", color: "white", fontSize: "9px", fontWeight: "700", padding: "1px 4px", borderRadius: "6px" }}>SIN STK</span>}
                    <div style={{ fontSize: "32px", marginBottom: "6px" }}>
                      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "8px" }} /> : "📦"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#1A202C", fontWeight: "600", marginBottom: "4px", lineHeight: "1.3", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{product.name}</div>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#1E3A5F" }}>{formatARS(product.salePrice)}</div>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: isOutOfStock ? "#E74C3C" : isLowStock ? "#F39C12" : "#2ECC71", marginTop: "4px" }}>
                      {isOutOfStock ? "Sin stock" : `Stock: ${product.stock}`}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart panel - Desktop */}
        <div style={{ width: "300px", background: "white", borderLeft: "1px solid #E2E8F0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "16px", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ fontWeight: "800", color: "#1E3A5F", fontSize: "16px" }}>🛒 Carrito {cart.length > 0 && `(${cart.length} ítems)`}</div>
          </div>

          {/* Discount */}
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #F7FAFC", display: "flex", gap: "6px" }}>
            <select value={discountType} onChange={e => setDiscountType(e.target.value as "amount" | "percent")}
              style={{ padding: "6px 8px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px" }}>
              <option value="amount">$ Desc.</option>
              <option value="percent">% Desc.</option>
            </select>
            <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0"
              style={{ flex: 1, padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px", outline: "none" }} />
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "#A0AEC0" }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>🛒</div>
                <p style={{ fontSize: "13px" }}>Tocá un producto para agregarlo</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} style={{ padding: "10px", background: "#F7FAFC", borderRadius: "10px", marginBottom: "6px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#1A202C", marginBottom: "6px" }}>{item.product.name}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        style={{ width: "28px", height: "28px", background: "#E2E8F0", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "16px", minHeight: "28px" }}>−</button>
                      <span style={{ fontWeight: "700", minWidth: "20px", textAlign: "center" }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        style={{ width: "28px", height: "28px", background: "#1E3A5F", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "16px", minHeight: "28px" }}>+</button>
                    </div>
                    <div style={{ fontWeight: "700", color: "#1E3A5F" }}>{formatARS(parseFloat(item.product.salePrice) * item.quantity)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart total & checkout */}
          <div style={{ padding: "16px", borderTop: "1px solid #E2E8F0" }}>
            {cart.length > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#718096", fontSize: "14px" }}>Subtotal</span>
                  <span style={{ color: "#1A202C" }}>{formatARS(cartSubtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ color: "#718096", fontSize: "14px" }}>Descuento</span>
                    <span style={{ color: "#E74C3C" }}>-{formatARS(discountAmount)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", paddingTop: "8px", borderTop: "2px solid #E2E8F0" }}>
                  <span style={{ fontWeight: "800", fontSize: "18px", color: "#1A202C" }}>TOTAL</span>
                  <span style={{ fontWeight: "800", fontSize: "18px", color: "#1E3A5F" }}>{formatARS(cartTotal)}</span>
                </div>
              </>
            )}
            <button
              onClick={() => cart.length > 0 ? setShowCheckout(true) : showToast("Agregá productos al carrito", "error")}
              style={{ width: "100%", padding: "14px", background: cart.length > 0 ? "#2ECC71" : "#A0AEC0", color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "800", cursor: cart.length > 0 ? "pointer" : "not-allowed", minHeight: "52px" }}>
              💰 COBRAR {cart.length > 0 ? formatARS(cartTotal) : ""}
            </button>
            {cart.length > 0 && (
              <button onClick={() => { if (confirm("¿Limpiar el carrito?")) setCart([]); }}
                style={{ width: "100%", marginTop: "8px", padding: "8px", background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", color: "#718096", fontSize: "13px", cursor: "pointer", minHeight: "36px" }}>
                🗑️ Limpiar carrito
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile floating cart button */}
      {cart.length > 0 && !showCheckout && (
        <div style={{ display: "none" }}>
          {/* Hidden on desktop (handled by side panel) */}
        </div>
      )}
    </div>
  );
}
