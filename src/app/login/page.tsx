"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@barriodesk.ar");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1E3A5F 0%, #2D5A8E 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "white", borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "64px", height: "64px", background: "linear-gradient(135deg, #1E3A5F, #2D5A8E)", borderRadius: "16px", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "32px" }}>🏪</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#1E3A5F", margin: "0 0 4px" }}>BarrioDesk</h1>
          <p style={{ color: "#718096", fontSize: "14px" }}>Gestión para kioscos del Norte Argentino</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "6px", color: "#1A202C", fontSize: "14px" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "12px 16px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "16px", outline: "none", transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = "#1E3A5F"}
              onBlur={e => e.target.style.borderColor = "#E2E8F0"}
              placeholder="tu@email.com"
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "6px", color: "#1A202C", fontSize: "14px" }}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "12px 16px", border: "2px solid #E2E8F0", borderRadius: "10px", fontSize: "16px", outline: "none" }}
              onFocus={e => e.target.style.borderColor = "#1E3A5F"}
              onBlur={e => e.target.style.borderColor = "#E2E8F0"}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{ background: "#FFF5F5", border: "1px solid #FED7D7", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", color: "#E74C3C", fontSize: "14px" }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "14px", background: loading ? "#A0AEC0" : "#1E3A5F", color: "white", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", transition: "background 0.2s", minHeight: "48px" }}
          >
            {loading ? "Ingresando..." : "Ingresar al sistema"}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid #E2E8F0", paddingTop: "20px" }}>
          <p style={{ color: "#718096", fontSize: "14px", marginBottom: "8px" }}>¿No tenés cuenta?{" "}
            <Link href="/register" style={{ color: "#1E3A5F", fontWeight: "600", textDecoration: "none" }}>Registrate gratis</Link>
          </p>
          <div style={{ background: "#F7FAFC", borderRadius: "8px", padding: "12px", marginTop: "16px", fontSize: "13px", color: "#718096" }}>
            <strong style={{ color: "#1E3A5F" }}>Demo:</strong> demo@barriodesk.ar / demo1234
          </div>
        </div>
      </div>
    </div>
  );
}
