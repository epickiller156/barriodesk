"use client";
import { useState, useEffect } from "react";
import { formatARS, formatDateTime } from "@/lib/utils";

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  orderType: string;
  deliveryAddress: string | null;
  paymentMethod: string;
  total: string;
  status: "NEW" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
  notes: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  NEW: { label: "Nuevo", color: "#3498DB" },
  CONFIRMED: { label: "Confirmado", color: "#2ECC71" },
  PREPARING: { label: "Preparando", color: "#F39C12" },
  READY: { label: "Listo", color: "#9B59B6" },
  DELIVERED: { label: "Entregado", color: "#1E3A5F" },
  CANCELLED: { label: "Cancelado", color: "#E74C3C" },
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "Efectivo",
  MERCADOPAGO_QR: "MercadoPago",
  TRANSFER: "Transferencia",
  DEBIT_CARD: "Débito",
  CREDIT_CARD: "Crédito",
  FIADO: "Fiado",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      setMessage({ text: "Error al cargar pedidos", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateOrderStatus = async (orderId: string, status: string) => {
    setProcessing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Error al actualizar", type: "error" });
      } else {
        setMessage({ text: data.message, type: "success" });
        setSelectedOrder(null);
        loadOrders();
      }
    } catch {
      setMessage({ text: "Error de conexión", type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "24px", textAlign: "center" }}>⏳ Cargando pedidos...</div>;
  }

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F", marginBottom: "8px" }}>
        📦 Pedidos online
      </h1>
      <p style={{ color: "#718096", fontSize: "14px", marginBottom: "24px" }}>
        Gestioná los pedidos que hacen los clientes desde el catálogo online
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

      {!selectedOrder ? (
        <div>
          {orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px", color: "#718096" }}>
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>📦</div>
              <p>No hay pedidos todavía</p>
              <p style={{ fontSize: "13px", marginTop: "4px" }}>
                Los pedidos que hagan los clientes desde el catálogo online aparecerán aquí
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {orders.map(order => {
                const status = statusLabels[order.status] || { label: order.status, color: "#718096" };
                return (
                  <div key={order.id} onClick={() => setSelectedOrder(order)}
                    style={{
                      background: "white", border: "1px solid #E2E8F0", borderRadius: "12px",
                      padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                    <div>
                      <div style={{ fontWeight: "700", color: "#1A202C" }}>
                        {order.customerName}
                        <span style={{
                          fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px",
                          marginLeft: "8px", background: status.color + "20", color: status.color,
                        }}>
                          {status.label}
                        </span>
                      </div>
                      <div style={{ fontSize: "13px", color: "#718096" }}>
                        {formatDateTime(order.createdAt)} · {order.items.length} producto(s) · {paymentMethodLabels[order.paymentMethod] || order.paymentMethod}
                      </div>
                    </div>
                    <div style={{ fontWeight: "800", color: "#1E3A5F", fontSize: "16px" }}>
                      {formatARS(order.total)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          <button onClick={() => setSelectedOrder(null)}
            style={{ background: "none", border: "none", color: "#1E3A5F", cursor: "pointer", fontWeight: "600", marginBottom: "16px", fontSize: "14px" }}>
            ← Volver a pedidos
          </button>

          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <div style={{ fontWeight: "700", fontSize: "16px" }}>{selectedOrder.customerName}</div>
                <div style={{ fontSize: "13px", color: "#718096" }}>
                  {formatDateTime(selectedOrder.createdAt)}
                </div>
              </div>
              <span style={{
                fontSize: "12px", fontWeight: "700", padding: "4px 12px", borderRadius: "20px",
                background: (statusLabels[selectedOrder.status]?.color || "#718096") + "20",
                color: statusLabels[selectedOrder.status]?.color || "#718096",
              }}>
                {statusLabels[selectedOrder.status]?.label || selectedOrder.status}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#718096" }}>Teléfono</div>
                <div style={{ fontWeight: "600" }}>📱 {selectedOrder.customerPhone}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#718096" }}>Tipo</div>
                <div style={{ fontWeight: "600" }}>
                  {selectedOrder.orderType === "delivery" ? "🛵 Delivery" : "🏪 Retiro en local"}
                </div>
              </div>
            </div>

            {selectedOrder.deliveryAddress && (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: "#718096" }}>Dirección de entrega</div>
                <div style={{ fontWeight: "600" }}>📍 {selectedOrder.deliveryAddress}</div>
              </div>
            )}

            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: "#718096" }}>Método de pago</div>
              <div style={{ fontWeight: "600" }}>{paymentMethodLabels[selectedOrder.paymentMethod] || selectedOrder.paymentMethod}</div>
            </div>

            {selectedOrder.notes && (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: "#718096" }}>Notas</div>
                <div style={{ fontWeight: "600" }}>📝 {selectedOrder.notes}</div>
              </div>
            )}
          </div>

          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "12px" }}>Productos</div>
            {selectedOrder.items.map((item, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F7FAFC" }}>
                <span style={{ fontSize: "14px" }}>{item.productName} x{item.quantity}</span>
                <span style={{ fontWeight: "700" }}>{formatARS(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontWeight: "800", fontSize: "16px" }}>
              <span>TOTAL:</span>
              <span style={{ color: "#1E3A5F" }}>{formatARS(selectedOrder.total)}</span>
            </div>
          </div>

          {selectedOrder.status === "NEW" && (
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => updateOrderStatus(selectedOrder.id, "CONFIRMED")} disabled={processing}
                style={{
                  flex: 1, padding: "14px", background: processing ? "#A0AEC0" : "#2ECC71",
                  color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700",
                  cursor: processing ? "not-allowed" : "pointer", minHeight: "48px",
                }}>
                {processing ? "⏳ Procesando..." : "✅ Confirmar pedido"}
              </button>
              <button onClick={() => updateOrderStatus(selectedOrder.id, "CANCELLED")} disabled={processing}
                style={{
                  flex: 1, padding: "14px", background: processing ? "#A0AEC0" : "#E74C3C",
                  color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700",
                  cursor: processing ? "not-allowed" : "pointer", minHeight: "48px",
                }}>
                {processing ? "⏳ Procesando..." : "❌ Cancelar pedido"}
              </button>
            </div>
          )}

          {selectedOrder.status === "CONFIRMED" && (
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => updateOrderStatus(selectedOrder.id, "PREPARING")} disabled={processing}
                style={{
                  flex: 1, padding: "14px", background: processing ? "#A0AEC0" : "#F39C12",
                  color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700",
                  cursor: processing ? "not-allowed" : "pointer", minHeight: "48px",
                }}>
                {processing ? "⏳ Procesando..." : "👨‍🍳 Preparar"}
              </button>
              <button onClick={() => updateOrderStatus(selectedOrder.id, "CANCELLED")} disabled={processing}
                style={{
                  flex: 1, padding: "14px", background: processing ? "#A0AEC0" : "#E74C3C",
                  color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700",
                  cursor: processing ? "not-allowed" : "pointer", minHeight: "48px",
                }}>
                {processing ? "⏳ Procesando..." : "❌ Cancelar"}
              </button>
            </div>
          )}

          {selectedOrder.status === "PREPARING" && (
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => updateOrderStatus(selectedOrder.id, "READY")} disabled={processing}
                style={{
                  flex: 1, padding: "14px", background: processing ? "#A0AEC0" : "#9B59B6",
                  color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700",
                  cursor: processing ? "not-allowed" : "pointer", minHeight: "48px",
                }}>
                {processing ? "⏳ Procesando..." : "✅ Listo para entregar"}
              </button>
              <button onClick={() => updateOrderStatus(selectedOrder.id, "CANCELLED")} disabled={processing}
                style={{
                  flex: 1, padding: "14px", background: processing ? "#A0AEC0" : "#E74C3C",
                  color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700",
                  cursor: processing ? "not-allowed" : "pointer", minHeight: "48px",
                }}>
                {processing ? "⏳ Procesando..." : "❌ Cancelar"}
              </button>
            </div>
          )}

          {selectedOrder.status === "READY" && (
            <button onClick={() => updateOrderStatus(selectedOrder.id, "DELIVERED")} disabled={processing}
              style={{
                width: "100%", padding: "14px", background: processing ? "#A0AEC0" : "#1E3A5F",
                color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700",
                cursor: processing ? "not-allowed" : "pointer", minHeight: "48px",
              }}>
              {processing ? "⏳ Procesando..." : "🚀 Marcar como entregado"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
