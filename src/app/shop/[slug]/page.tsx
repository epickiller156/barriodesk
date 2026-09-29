"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { formatARS, generateWhatsAppUrl } from "@/lib/utils";

interface StoreInfo {
  id: string; name: string; address: string; neighborhood: string; city: string;
  phone: string | null; whatsappNumber: string | null; logoUrl: string | null;
}
interface StoreSettings {
  acceptCash: boolean; acceptMercadoPago: boolean; acceptTransfer: boolean;
  acceptDelivery: boolean; acceptPickup: boolean;
  minOrderAmount: string | null; estimatedPickupMinutes: number | null; welcomeMessage: string | null;
}
interface Product {
  id: string; name: string; salePrice: string; imageUrl: string | null; stock: number;
  categoryId: string | null;
}
interface Category { id: string; name: string; icon: string | null; }

interface CartItem { product: Product; quantity: number; }

export default function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: "", phone: "", orderType: "pickup", address: "", paymentMethod: "CASH", notes: "" });

  useEffect(() => {
    fetch(`/api/storefront/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setStore(data.store);
        setSettings(data.settings);
        setProducts(data.products || []);
        setCategories(data.categories || []);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        // Validar que no exceda el stock disponible
        if (existing.quantity >= product.stock) {
          alert(`Solo hay ${product.stock} unidades disponibles de ${product.name}`);
          return prev;
        }
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const cartTotal = cart.reduce((s, i) => s + parseFloat(i.product.salePrice) * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCat || p.categoryId === selectedCat;
    return matchSearch && matchCat;
  });

  const handleOrder = async () => {
    if (!checkoutForm.name || !checkoutForm.phone) { alert("Ingresá tu nombre y teléfono"); return; }
    if (cart.length === 0) { alert("El carrito está vacío"); return; }
    
    // Validar stock antes de enviar
    for (const item of cart) {
      if (item.quantity > item.product.stock) {
        alert(`No hay suficiente stock de ${item.product.name}. Disponible: ${item.product.stock}`);
        return;
      }
    }
    
    try {
      const res = await fetch(`/api/storefront/${slug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: checkoutForm.name,
          customerPhone: checkoutForm.phone,
          orderType: checkoutForm.orderType,
          deliveryAddress: checkoutForm.address,
          paymentMethod: checkoutForm.paymentMethod,
          notes: checkoutForm.notes,
          items: cart.map(i => ({
            productId: i.product.id,
            productName: i.product.name,
            quantity: i.quantity,
            unitPrice: parseFloat(i.product.salePrice),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Error al crear el pedido"); return; }
      alert("✅ Pedido enviado! El kiosco te contactará para confirmar.");
      setCart([]);
      setShowCheckout(false);
      setShowCart(false);
    } catch {
      alert("Error de conexión. Intentá de nuevo.");
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FA" }}>
      <div style={{ textAlign: "center", color: "#718096" }}>
        <div style={{ fontSize: "40px", marginBottom: "8px" }}>🏪</div>
        <p>Cargando catálogo...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FA" }}>
      <div style={{ textAlign: "center", color: "#718096", padding: "24px" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🏪</div>
        <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Catálogo no disponible</h2>
        <p>{error}</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FA", paddingBottom: cartCount > 0 ? "80px" : "0" }}>
      {/* Store header */}
      <div style={{ background: "linear-gradient(135deg, #1E3A5F, #2D5A8E)", color: "white", padding: "24px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "8px" }}>🏪</div>
        <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "4px" }}>{store?.name}</h1>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)", marginBottom: "4px" }}>📍 {store?.address}, {store?.neighborhood}</p>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>{store?.city}</p>
        {settings?.welcomeMessage && <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", marginTop: "10px", fontStyle: "italic" }}>"{settings.welcomeMessage}"</p>}
        {store?.whatsappNumber && (
          <a href={`https://wa.me/${store.whatsappNumber.replace(/\D/g, "")}`} target="_blank"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "14px", background: "#25D366", color: "white", padding: "10px 20px", borderRadius: "20px", textDecoration: "none", fontWeight: "700", fontSize: "14px" }}>
            📱 Contactar por WhatsApp
          </a>
        )}
      </div>

      {/* Search and categories */}
      <div style={{ position: "sticky", top: 0, background: "white", borderBottom: "1px solid #E2E8F0", padding: "12px 16px", zIndex: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar productos..."
          style={{ width: "100%", padding: "10px 14px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "15px", outline: "none", marginBottom: "10px" }} />
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          <button onClick={() => setSelectedCat("")}
            style={{ padding: "6px 14px", borderRadius: "20px", border: "none", background: !selectedCat ? "#1E3A5F" : "#F7FAFC", color: !selectedCat ? "white" : "#4A5568", cursor: "pointer", fontSize: "13px", fontWeight: selectedCat === "" ? "700" : "400", whiteSpace: "nowrap", minHeight: "36px" }}>
            Todos
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCat(cat.id === selectedCat ? "" : cat.id)}
              style={{ padding: "6px 14px", borderRadius: "20px", border: "none", background: selectedCat === cat.id ? "#1E3A5F" : "#F7FAFC", color: selectedCat === cat.id ? "white" : "#4A5568", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap", minHeight: "36px" }}>
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      <div style={{ padding: "16px", maxWidth: "800px", margin: "0 auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#718096" }}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>🔍</div>
            <p>No encontramos productos con esa búsqueda</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>
            {filtered.map(p => {
              const inCart = cart.find(i => i.product.id === p.id);
              const outOfStock = p.stock <= 0;
              return (
                <div key={p.id} style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", opacity: outOfStock ? 0.6 : 1 }}>
                  <div style={{ height: "120px", background: "#F7FAFC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📦"}
                  </div>
                  <div style={{ padding: "10px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#1A202C", marginBottom: "4px", lineHeight: "1.3", minHeight: "32px" }}>{p.name}</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#1E3A5F", marginBottom: "4px" }}>{formatARS(p.salePrice)}</div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: outOfStock ? "#E74C3C" : p.stock <= 5 ? "#F39C12" : "#2ECC71", marginBottom: "8px" }}>
                      {outOfStock ? "Sin stock" : `Stock: ${p.stock}`}
                    </div>
                    {outOfStock ? (
                      <div style={{ width: "100%", padding: "8px", background: "#F7FAFC", color: "#A0AEC0", textAlign: "center", borderRadius: "8px", fontSize: "13px", fontWeight: "600" }}>Sin stock</div>
                    ) : inCart ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1E3A5F", borderRadius: "8px", padding: "4px" }}>
                        <button onClick={() => setCart(prev => prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0))}
                          style={{ width: "28px", height: "28px", background: "rgba(255,255,255,0.2)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "800", fontSize: "16px", minHeight: "28px" }}>−</button>
                        <span style={{ color: "white", fontWeight: "800" }}>{inCart.quantity}</span>
                        <button onClick={() => addToCart(p)}
                          style={{ width: "28px", height: "28px", background: "rgba(255,255,255,0.2)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "800", fontSize: "16px", minHeight: "28px" }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(p)}
                        style={{ width: "100%", padding: "8px", background: "#1E3A5F", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "13px", minHeight: "36px" }}>
                        + Agregar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <div style={{ position: "fixed", bottom: "16px", left: "50%", transform: "translateX(-50%)", zIndex: 50 }}>
          <button onClick={() => setShowCheckout(true)}
            style={{ background: "#1E3A5F", color: "white", padding: "14px 28px", borderRadius: "50px", border: "none", cursor: "pointer", fontWeight: "800", fontSize: "15px", boxShadow: "0 4px 20px rgba(30,58,95,0.4)", display: "flex", alignItems: "center", gap: "10px", minHeight: "52px" }}>
            🛒 Ver carrito ({cartCount}) · {formatARS(cartTotal)}
          </button>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", padding: "24px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1E3A5F" }}>📦 Finalizar pedido</h2>
              <button onClick={() => setShowCheckout(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>
            {/* Cart summary */}
            <div style={{ background: "#F7FAFC", borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
              {cart.map(i => (
                <div key={i.product.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #E2E8F0" }}>
                  <span style={{ fontSize: "14px" }}>{i.product.name} x{i.quantity}</span>
                  <span style={{ fontWeight: "700" }}>{formatARS(parseFloat(i.product.salePrice) * i.quantity)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", fontWeight: "800", fontSize: "16px" }}>
                <span>TOTAL:</span>
                <span style={{ color: "#1E3A5F" }}>{formatARS(cartTotal)}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Tu nombre *</label>
                <input value={checkoutForm.name} onChange={e => setCheckoutForm(f => ({ ...f, name: e.target.value }))} placeholder="Rosa Gómez"
                  style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "15px", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Tu teléfono (WhatsApp) *</label>
                <input value={checkoutForm.phone} onChange={e => setCheckoutForm(f => ({ ...f, phone: e.target.value }))} placeholder="381 456 7890"
                  style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "15px", outline: "none" }} />
              </div>
              {settings?.acceptDelivery && (
                <div>
                  <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Tipo de entrega</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {[{ v: "pickup", l: "🏪 Retiro en local" }, { v: "delivery", l: "🛵 Delivery" }].map(o => (
                      <button key={o.v} type="button" onClick={() => setCheckoutForm(f => ({ ...f, orderType: o.v }))}
                        style={{ padding: "10px", border: `2px solid ${checkoutForm.orderType === o.v ? "#1E3A5F" : "#E2E8F0"}`, borderRadius: "10px", background: checkoutForm.orderType === o.v ? "#EBF4FF" : "white", cursor: "pointer", fontWeight: checkoutForm.orderType === o.v ? "700" : "400", fontSize: "13px", minHeight: "44px" }}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {checkoutForm.orderType === "delivery" && (
                <div>
                  <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Dirección de entrega</label>
                  <input value={checkoutForm.address} onChange={e => setCheckoutForm(f => ({ ...f, address: e.target.value }))} placeholder="Av. Sarmiento 1245, Alberdi"
                    style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px", outline: "none" }} />
                </div>
              )}
              <div>
                <label style={{ display: "block", fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>Método de pago</label>
                <select value={checkoutForm.paymentMethod} onChange={e => setCheckoutForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "14px" }}>
                  {settings?.acceptCash && <option value="CASH">💵 Efectivo</option>}
                  {settings?.acceptMercadoPago && <option value="MERCADOPAGO_QR">📱 MercadoPago</option>}
                  {settings?.acceptTransfer && <option value="TRANSFER">🏦 Transferencia</option>}
                </select>
              </div>
            </div>
            <button onClick={handleOrder}
              style={{ width: "100%", padding: "16px", background: "#25D366", color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "800", cursor: "pointer", minHeight: "56px" }}>
              📱 Hacer pedido por WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
