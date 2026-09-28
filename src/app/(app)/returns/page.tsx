"use client";
import { useState, useEffect } from "react";
import { formatARS, formatDateTime } from "@/lib/utils";

interface Sale {
  id: string;
  saleNumber: number;
  total: string;
  subtotal: string;
  paymentMethod: string;
  paymentStatus: string;
  isFiado: boolean;
  customerId: string | null;
  notes: string | null;
  createdAt: string;
}

interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
}

interface Customer {
  id: string;
  name: string;
  nickname: string | null;
  phone: string | null;
}

interface ReturnItem {
  productId: string;
  quantity: number;
}

const paymentMethodLabels: Record<string, string> = {
  CASH: "Efectivo", MERCADOPAGO_QR: "MercadoPago", TRANSFER: "Transferencia",
  DEBIT_CARD: "Débito", CREDIT_CARD: "Crédito", FIADO: "Fiado", MIXED: "Mixto",
};

export default function ReturnsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/sales?limit=50")
      .then(r => r.json())
      .then(data => setSales(data.sales || []))
      .finally(() => setLoading(false));
  }, []);

  const selectSale = async (sale: Sale) => {
    setSelectedSale(sale);
    setSaleItems([]);
    setCustomer(null);
    setReturnItems([]);
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/sales/${sale.id}`);
      const data = await res.json();
      if (data.error) {
        setMessage({ text: data.error, type: "error" });
        return;
      }
      setSaleItems(data.items || []);
      setCustomer(data.customer || null);
      setReturnItems((data.items || []).map((item: SaleItem) => ({
        productId: item.productId,
        quantity: 0,
      })));
    } catch {
      setMessage({ text: "Error al cargar los productos", type: "error" });
    } finally {
      setLoadingItems(false);
    }
  };

  const updateReturnQty = (productId: string, qty: number) => {
    setReturnItems(prev => prev.map(item =>
      item.productId === productId ? { ...item, quantity: qty } : item
    ));
  };

  const handleReturn = async () => {
    if (!selectedSale) return;
    const itemsToReturn = returnItems.filter(i => i.quantity > 0);
    if (itemsToReturn.length === 0) {
      setMessage({ text: "Seleccioná al menos un producto para devolver", type: "error" });
      return;
    }

    setProcessing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/sales/${selectedSale.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToReturn }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Error al procesar devolución", type: "error" });
      } else {
        setMessage({ text: data.message, type: "success" });
        setSelectedSale(null);
        setSaleItems([]);
        setReturnItems([]);
        // Refresh sales list
        const salesRes = await fetch("/api/sales?limit=50");
        const salesData = await salesRes.json();
        setSales(salesData.sales || []);
      }
    } catch {
      setMessage({ text: "Error de conexión", type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "24px", textAlign: "center" }}>⏳ Cargando ventas...</div>;
  }

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F", marginBottom: "8px" }}>
        ↩️ Devoluciones
      </h1>
      <p style={{ color: "#718096", fontSize: "14px", marginBottom: "24px" }}>
        Revertí el stock de productos cuando un cliente cancela o devuelve un pedido
      </p>

      {message && (
        <div style={{
          background: message.type === "success" ? "#F0FFF4" : "#FFF5F5",
          border: `1px solid ${message.type === "success" ? "#9AE6B4" : "#FED7D7"}`,
          borderRadius: "10px", padding: "12px 16px", marginBottom: "16px",
          color: message.type === "success" ? "#2D6A4F" : "#E74C3C", fontWeight: "600",
        }}>
          {message.type === "success" ? "✅" : "❌"} {message.text}
        </div>
      )}

      {!selectedSale ? (
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px" }}>Seleccioná una venta</h2>
          {sales.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px", color: "#718096" }}>
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>🧾</div>
              <p>No hay ventas registradas</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {sales.map(sale => (
                <div key={sale.id} onClick={() => selectSale(sale)}
                  style={{
                    background: "white", border: "1px solid #E2E8F0", borderRadius: "12px",
                    padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                  <div>
                    <div style={{ fontWeight: "700", color: "#1A202C" }}>
                      Venta #{sale.saleNumber} {sale.isFiado && <span style={{ color: "#F5A623", fontSize: "12px" }}>📋 FIADO</span>}
                    </div>
                    <div style={{ fontSize: "13px", color: "#718096" }}>
                      {formatDateTime(sale.createdAt)} · {paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod}
                    </div>
                  </div>
                  <div style={{ fontWeight: "800", color: "#1E3A5F", fontSize: "16px" }}>
                    {formatARS(sale.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <button onClick={() => { setSelectedSale(null); setSaleItems([]); setReturnItems([]); }}
            style={{ background: "none", border: "none", color: "#1E3A5F", cursor: "pointer", fontWeight: "600", marginBottom: "16px", fontSize: "14px" }}>
            ← Volver a ventas
          </button>

          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "4px" }}>
              Venta #{selectedSale.saleNumber}
            </div>
            <div style={{ fontSize: "13px", color: "#718096" }}>
              {formatDateTime(selectedSale.createdAt)} · {paymentMethodLabels[selectedSale.paymentMethod] || selectedSale.paymentMethod}
              {selectedSale.isFiado && <span style={{ color: "#F5A623" }}> · FIADO</span>}
            </div>
            {customer && (
              <div style={{ marginTop: "12px", padding: "10px", background: "#F7FAFC", borderRadius: "8px" }}>
                <div style={{ fontSize: "12px", color: "#718096" }}>Cliente</div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>
                  {customer.nickname || customer.name}
                </div>
                {customer.phone && (
                  <div style={{ fontSize: "13px", color: "#718096" }}>📱 {customer.phone}</div>
                )}
              </div>
            )}
          </div>

          {loadingItems ? (
            <div style={{ textAlign: "center", padding: "24px" }}>⏳ Cargando productos...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {saleItems.map((item, idx) => {
                const maxQty = parseFloat(item.quantity);
                const returnQty = returnItems[idx]?.quantity || 0;
                return (
                  <div key={item.id} style={{
                    background: "white", border: "1px solid #E2E8F0", borderRadius: "12px",
                    padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "14px" }}>{item.productName}</div>
                      <div style={{ fontSize: "12px", color: "#718096" }}>
                        {maxQty} unidades · {formatARS(item.unitPrice)} c/u
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button onClick={() => updateReturnQty(item.productId, Math.max(0, returnQty - 1))}
                        style={{ width: "32px", height: "32px", background: "#E2E8F0", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "16px" }}>
                        −
                      </button>
                      <span style={{ fontWeight: "700", minWidth: "30px", textAlign: "center" }}>{returnQty}</span>
                      <button onClick={() => updateReturnQty(item.productId, Math.min(maxQty, returnQty + 1))}
                        style={{ width: "32px", height: "32px", background: "#1E3A5F", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "16px" }}>
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={handleReturn} disabled={processing}
            style={{
              width: "100%", padding: "14px", background: processing ? "#A0AEC0" : "#E74C3C",
              color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700",
              cursor: processing ? "not-allowed" : "pointer", minHeight: "48px",
            }}>
            {processing ? "⏳ Procesando..." : "↩️ Procesar devolución"}
          </button>
        </div>
      )}
    </div>
  );
}
