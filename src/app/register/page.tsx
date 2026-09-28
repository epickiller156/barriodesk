"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const steps = ["Datos personales", "Tu negocio", "Elegí tu plan"];

const plans = [
  {
    key: "FREE",
    name: "Gratis",
    price: "Sin costo",
    features: ["POS básico", "Hasta 50 productos", "Inventario", "Cierre de caja"],
    color: "#718096",
  },
  {
    key: "VECINO",
    name: "Vecino",
    price: "$5.990/mes",
    features: ["Todo lo de Gratis", "Productos ilimitados", "Fiado digital", "Reportes", "Catálogo online"],
    color: "#1E3A5F",
    popular: true,
  },
  {
    key: "MAXIKIOSCO",
    name: "MaxiKiosco",
    price: "$12.990/mes",
    features: ["Todo lo de Vecino", "Múltiples empleados", "Facturación ARCA", "WhatsApp Business", "API acceso"],
    color: "#F5A623",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    storeName: "", storeNeighborhood: "", storeCity: "San Miguel de Tucumán",
    storeProvince: "Tucumán", storeType: "kiosco", storeAddress: "",
    plan: "VECINO",
  });

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleNext = () => {
    if (step === 0) {
      if (!form.name || !form.email || !form.password) { setError("Completá todos los campos obligatorios"); return; }
      if (form.password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    }
    if (step === 1) {
      if (!form.storeName || !form.storeAddress || !form.storeNeighborhood) { setError("Completá los datos del negocio"); return; }
    }
    setError("");
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al registrarse"); }
      else { router.push("/dashboard"); router.refresh(); }
    } catch { setError("Error de conexión"); }
    finally { setLoading(false); }
  };

  const inputStyle = { width: "100%", padding: "12px 16px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "16px", outline: "none", marginTop: "6px" };
  const labelStyle = { display: "block", fontWeight: "600", fontSize: "14px", color: "#1A202C" };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1E3A5F 0%, #2D5A8E 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "white", borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#1E3A5F" }}>🏪 BarrioDesk</h1>
          <p style={{ color: "#718096", fontSize: "14px", marginTop: "4px" }}>Creá tu cuenta gratis</p>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: "4px", borderRadius: "4px", background: i <= step ? "#1E3A5F" : "#E2E8F0", marginBottom: "6px" }} />
              <span style={{ fontSize: "11px", color: i <= step ? "#1E3A5F" : "#A0AEC0", fontWeight: i === step ? "700" : "400" }}>{s}</span>
            </div>
          ))}
        </div>

        {/* Step 0 */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div><label style={labelStyle}>Nombre completo *</label><input style={inputStyle} value={form.name} onChange={e => update("name", e.target.value)} placeholder="Carlos Mamani" /></div>
            <div><label style={labelStyle}>Email *</label><input style={inputStyle} type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="tu@email.com" /></div>
            <div><label style={labelStyle}>Contraseña *</label><input style={inputStyle} type="password" value={form.password} onChange={e => update("password", e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
            <div><label style={labelStyle}>Teléfono</label><input style={inputStyle} value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="381 456 7890" /></div>
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div><label style={labelStyle}>Nombre del negocio *</label><input style={inputStyle} value={form.storeName} onChange={e => update("storeName", e.target.value)} placeholder="Kiosco El Chino" /></div>
            <div><label style={labelStyle}>Dirección *</label><input style={inputStyle} value={form.storeAddress} onChange={e => update("storeAddress", e.target.value)} placeholder="Av. Sarmiento 1245" /></div>
            <div><label style={labelStyle}>Barrio *</label><input style={inputStyle} value={form.storeNeighborhood} onChange={e => update("storeNeighborhood", e.target.value)} placeholder="Alberdi" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={labelStyle}>Ciudad</label><input style={inputStyle} value={form.storeCity} onChange={e => update("storeCity", e.target.value)} /></div>
              <div><label style={labelStyle}>Provincia</label><input style={inputStyle} value={form.storeProvince} onChange={e => update("storeProvince", e.target.value)} /></div>
            </div>
            <div>
              <label style={labelStyle}>Tipo de negocio</label>
              <select style={{ ...inputStyle }} value={form.storeType} onChange={e => update("storeType", e.target.value)}>
                <option value="kiosco">Kiosco</option>
                <option value="almacen">Almacén</option>
                <option value="maxikiosco">Maxikiosco</option>
                <option value="despensa">Despensa</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {plans.map(plan => (
              <div key={plan.key} onClick={() => update("plan", plan.key)}
                style={{ border: `2px solid ${form.plan === plan.key ? plan.color : "#E2E8F0"}`, borderRadius: "12px", padding: "16px", cursor: "pointer", background: form.plan === plan.key ? `${plan.color}08` : "white", position: "relative" }}>
                {plan.popular && <span style={{ position: "absolute", top: "-10px", right: "12px", background: "#1E3A5F", color: "white", fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px" }}>POPULAR</span>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: "700", color: plan.color, fontSize: "16px" }}>{plan.name}</span>
                  <span style={{ fontWeight: "700", color: "#1A202C" }}>{plan.price}</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {plan.features.map((f, i) => <li key={i} style={{ fontSize: "13px", color: "#4A5568", padding: "2px 0" }}>✓ {f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {error && <div style={{ background: "#FFF5F5", border: "1px solid #FED7D7", borderRadius: "10px", padding: "12px 16px", marginTop: "16px", color: "#E74C3C", fontSize: "14px" }}>⚠️ {error}</div>}

        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          {step > 0 && <button onClick={() => setStep(s => s - 1)} style={{ flex: "0 0 auto", padding: "12px 20px", background: "white", border: "2px solid #E2E8F0", borderRadius: "10px", fontWeight: "600", cursor: "pointer", minHeight: "48px" }}>← Atrás</button>}
          {step < 2
            ? <button onClick={handleNext} style={{ flex: 1, padding: "14px", background: "#1E3A5F", color: "white", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "700", cursor: "pointer", minHeight: "48px" }}>Continuar →</button>
            : <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: "14px", background: loading ? "#A0AEC0" : "#2ECC71", color: "white", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", minHeight: "48px" }}>{loading ? "Creando cuenta..." : "🚀 Crear cuenta"}</button>
          }
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", color: "#718096", fontSize: "14px" }}>
          ¿Ya tenés cuenta? <Link href="/login" style={{ color: "#1E3A5F", fontWeight: "600", textDecoration: "none" }}>Ingresá acá</Link>
        </p>
      </div>
    </div>
  );
}
