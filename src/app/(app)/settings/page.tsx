"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface StoreData {
  id: string; name: string; address: string; neighborhood: string;
  city: string; province: string; phone: string | null; whatsappNumber: string | null;
  cuit: string | null; storeType: string; isStorefrontActive: boolean;
  slug: string; plan: string;
}

interface StoreForm {
  name: string;
  address: string;
  neighborhood: string;
  city: string;
  province: string;
  phone: string;
  whatsappNumber: string;
  cuit: string;
  storeType: string;
  isStorefrontActive: boolean;
  deliveryEnabled: boolean;
  deliveryCost: string;
  deliveryMessage: string;
}
interface UserData { id: string; name: string; email: string; phone: string | null; }

export default function SettingsPage() {
  const router = useRouter();
  const [store, setStore] = useState<StoreData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("store");
  const [success, setSuccess] = useState("");
  const [storeForm, setStoreForm] = useState<StoreForm>({
    name: "", address: "", neighborhood: "", city: "", province: "",
    phone: "", whatsappNumber: "", cuit: "", storeType: "kiosco", isStorefrontActive: false,
    deliveryEnabled: false, deliveryCost: "", deliveryMessage: "",
  });
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/store").then(r => r.json()),
    ]).then(([meData, storeData]) => {
      if (meData.user) { setUser(meData.user); }
      if (meData.store) { 
        setStore(meData.store); 
        setStoreForm(f => ({
          ...f,
          name: meData.store.name || "",
          address: meData.store.address || "",
          neighborhood: meData.store.neighborhood || "",
          city: meData.store.city || "",
          province: meData.store.province || "",
          phone: meData.store.phone || "",
          whatsappNumber: meData.store.whatsappNumber || "",
          cuit: meData.store.cuit || "",
          storeType: meData.store.storeType || "kiosco",
          isStorefrontActive: meData.store.isStorefrontActive || false,
        }));
      }
      if (storeData.settings) {
        setStoreForm(f => ({
          ...f,
          deliveryEnabled: storeData.settings.acceptDelivery || false,
          deliveryCost: storeData.settings.deliveryCost || "",
          deliveryMessage: storeData.settings.deliveryMessage || "",
        }));
      }
      setLoading(false);
    }).catch(err => {
      console.error("Error cargando datos:", err);
      setLoading(false);
    });
  }, []);

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (loading) return <div style={{ padding: "24px" }}>⏳ Cargando...</div>;

  const tabs = [
    { key: "store", label: "🏪 Negocio" },
    { key: "security", label: "🔒 Seguridad" },
    { key: "about", label: "ℹ️ Acerca de" },
  ];

  const inputStyle = { width: "100%", padding: "10px 14px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "15px", outline: "none" };
  const labelStyle = { display: "block", fontWeight: "600", fontSize: "14px", color: "#1A202C", marginBottom: "6px" };

  return (
    <div style={{ padding: "20px", maxWidth: "700px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1E3A5F", marginBottom: "24px" }}>⚙️ Configuración</h1>

      {success && <div style={{ background: "#F0FFF4", border: "1px solid #9AE6B4", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", color: "#2D6A4F", fontWeight: "600" }}>{success}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", background: "#F7FAFC", borderRadius: "12px", padding: "4px" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: "8px 12px", background: tab === t.key ? "white" : "transparent", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: tab === t.key ? "700" : "400", fontSize: "13px", color: tab === t.key ? "#1E3A5F" : "#718096", boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none", minHeight: "40px" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "store" && store && (
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid #E2E8F0" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", color: "#1A202C" }}>Datos del negocio</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div><label style={labelStyle}>Nombre del negocio</label><input style={inputStyle} value={storeForm.name || ""} onChange={e => setStoreForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label style={labelStyle}>Dirección</label><input style={inputStyle} value={storeForm.address || ""} onChange={e => setStoreForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={labelStyle}>Barrio</label><input style={inputStyle} value={storeForm.neighborhood || ""} onChange={e => setStoreForm(f => ({ ...f, neighborhood: e.target.value }))} /></div>
              <div><label style={labelStyle}>Ciudad</label><input style={inputStyle} value={storeForm.city || ""} onChange={e => setStoreForm(f => ({ ...f, city: e.target.value }))} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={labelStyle}>Teléfono</label><input style={inputStyle} value={storeForm.phone || ""} onChange={e => setStoreForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label style={labelStyle}>WhatsApp</label><input style={inputStyle} value={storeForm.whatsappNumber || ""} onChange={e => setStoreForm(f => ({ ...f, whatsappNumber: e.target.value }))} /></div>
            </div>
            <div><label style={labelStyle}>CUIT</label><input style={inputStyle} value={storeForm.cuit || ""} onChange={e => setStoreForm(f => ({ ...f, cuit: e.target.value }))} placeholder="20-28456789-1" /></div>
            <div>
              <label style={labelStyle}>Tipo de negocio</label>
              <select style={inputStyle} value={storeForm.storeType || "kiosco"} onChange={e => setStoreForm(f => ({ ...f, storeType: e.target.value }))}>
                <option value="kiosco">Kiosco</option>
                <option value="almacen">Almacén</option>
                <option value="maxikiosco">Maxikiosco</option>
                <option value="despensa">Despensa</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F7FAFC", borderRadius: "10px" }}>
              <div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>Catálogo online</div>
                <div style={{ fontSize: "12px", color: "#718096" }}>Permitir que los clientes vean tus productos y hagan pedidos</div>
              </div>
              <button
                onClick={() => setStoreForm(f => ({ ...f, isStorefrontActive: !f.isStorefrontActive }))}
                style={{
                  width: "48px", height: "28px", borderRadius: "14px", border: "none", cursor: "pointer",
                  background: storeForm.isStorefrontActive ? "#2ECC71" : "#CBD5E0",
                  position: "relative", transition: "all 0.2s",
                }}
              >
                <span style={{
                  position: "absolute", top: "2px", left: storeForm.isStorefrontActive ? "22px" : "2px",
                  width: "24px", height: "24px", borderRadius: "50%", background: "white",
                  transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>
            <div style={{ background: "#F7FAFC", borderRadius: "10px", padding: "12px 16px" }}>
              <div style={{ fontSize: "13px", color: "#718096", marginBottom: "4px" }}>URL de tu catálogo online:</div>
              <div style={{ fontWeight: "700", color: "#1E3A5F", wordBreak: "break-all" }}>
                {typeof window !== "undefined" ? window.location.origin : ""}/shop/{store.slug}
              </div>
            </div>

            {/* Delivery Configuration */}
            <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #E2E8F0" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "12px", color: "#1A202C" }}>🚚 Configuración de Delivery</h3>
              
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F7FAFC", borderRadius: "10px", marginBottom: "14px" }}>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "14px" }}>Habilitar delivery</div>
                  <div style={{ fontSize: "12px", color: "#718096" }}>Permitir que los clientes pidan delivery</div>
                </div>
                <button
                  onClick={() => setStoreForm(f => ({ ...f, deliveryEnabled: !f.deliveryEnabled }))}
                  style={{
                    width: "48px", height: "28px", borderRadius: "14px", border: "none", cursor: "pointer",
                    background: storeForm.deliveryEnabled ? "#2ECC71" : "#CBD5E0",
                    position: "relative", transition: "all 0.2s",
                  }}
                >
                  <span style={{
                    position: "absolute", top: "2px", left: storeForm.deliveryEnabled ? "22px" : "2px",
                    width: "24px", height: "24px", borderRadius: "50%", background: "white",
                    transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }} />
                </button>
              </div>

              {storeForm.deliveryEnabled && (
                <>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={labelStyle}>Costo de delivery</label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={storeForm.deliveryCost}
                      onChange={e => setStoreForm(f => ({ ...f, deliveryCost: e.target.value }))}
                      placeholder="500"
                    />
                  </div>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={labelStyle}>Mensaje para delivery (opcional)</label>
                    <textarea
                      style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
                      value={storeForm.deliveryMessage}
                      onChange={e => setStoreForm(f => ({ ...f, deliveryMessage: e.target.value }))}
                      placeholder="Ej: El delivery tarda aproximadamente 30 minutos"
                    />
                  </div>
                </>
              )}
            </div>
            <button onClick={async () => {
              setSaving(true);
              try {
                const res = await fetch("/api/store", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: storeForm.name,
                    address: storeForm.address,
                    neighborhood: storeForm.neighborhood,
                    city: storeForm.city,
                    province: storeForm.province,
                    phone: storeForm.phone,
                    whatsappNumber: storeForm.whatsappNumber,
                    cuit: storeForm.cuit,
                    storeType: storeForm.storeType,
                    isStorefrontActive: storeForm.isStorefrontActive,
                    acceptDelivery: storeForm.deliveryEnabled,
                    deliveryCost: storeForm.deliveryCost,
                    deliveryMessage: storeForm.deliveryMessage,
                  }),
                });
                const data = await res.json();
                if (!res.ok) { showSuccess("❌ " + (data.error || "Error al guardar")); return; }
                setStore(data.store);
                showSuccess("✅ Cambios guardados correctamente");
              } catch {
                showSuccess("❌ Error de conexión");
              } finally { setSaving(false); }
            }} disabled={saving}
              style={{ padding: "14px", background: "#1E3A5F", color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer", minHeight: "48px" }}>
              {saving ? "⏳ Guardando..." : "✅ Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      {tab === "security" && (
        <div style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid #E2E8F0" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", color: "#1A202C" }}>Seguridad</h2>
          <div style={{ background: "#F7FAFC", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontWeight: "700", fontSize: "15px" }}>{user?.name}</div>
            <div style={{ color: "#718096", fontSize: "13px" }}>{user?.email}</div>
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Nueva contraseña</label>
            <input type="password" style={inputStyle} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <button onClick={() => showSuccess("✅ Contraseña actualizada")}
            style={{ width: "100%", padding: "12px", background: "#1E3A5F", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px", minHeight: "44px" }}>
            Cambiar contraseña
          </button>
          <div style={{ marginTop: "24px", borderTop: "1px solid #E2E8F0", paddingTop: "20px" }}>
            <button onClick={handleLogout}
              style={{ width: "100%", padding: "12px", background: "#FFF5F5", color: "#E74C3C", border: "1px solid #FED7D7", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px", minHeight: "44px" }}>
              🚪 Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {tab === "about" && (
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", border: "1px solid #E2E8F0", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🏪</div>
          <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1E3A5F", marginBottom: "4px" }}>BarrioDesk</h2>
          <p style={{ color: "#718096", marginBottom: "8px" }}>Versión 1.0.0</p>
          <p style={{ color: "#718096", fontSize: "14px", lineHeight: "1.6" }}>
            La plataforma de gestión integral para kioscos y almacenes de barrio del Norte Argentino.
            Desarrollada para facilitar la vida del kiosquero tucumano.
          </p>
          <div style={{ marginTop: "24px", padding: "16px", background: "#F7FAFC", borderRadius: "12px" }}>
            <div style={{ fontSize: "13px", color: "#718096" }}>Tu negocio</div>
            <div style={{ fontWeight: "700", color: "#1E3A5F", fontSize: "16px" }}>{store?.name}</div>
            <div style={{ fontSize: "13px", color: "#718096", marginTop: "4px" }}>Plan: <strong>{store?.plan}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
