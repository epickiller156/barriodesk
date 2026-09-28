"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  // ✅ Esto soluciona el error: solo accede a window en el navegador
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Verificar al cargar
    checkMobile();

    // Verificar cuando cambia el tamaño de la ventana
    window.addEventListener("resize", checkMobile);

    // Limpiar el listener al desmontar
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const navItems = [
    { href: "/dashboard",   label: "Dashboard",     icon: "📊" },
    { href: "/pos",         label: "Punto de Venta", icon: "🛒" },
    { href: "/inventory",   label: "Inventario",    icon: "📦" },
    { href: "/fiado",       label: "Fiado",         icon: "📋" },
    { href: "/cash",        label: "Caja",          icon: "💵" },
    { href: "/purchases",   label: "Compras",       icon: "🚚" },
    { href: "/reports",     label: "Reportes",      icon: "📈" },
    { href: "/settings",    label: "Configuración", icon: "⚙️" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8F9FA" }}>

      {/* ── Overlay oscuro (solo mobile cuando sidebar está abierto) ── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 40,
          }}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        style={{
          width: "260px",
          background: "#1E3A5F",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          height: "100vh",
          zIndex: 50,
          transform: isMobile
            ? sidebarOpen ? "translateX(0)" : "translateX(-260px)"
            : "none",
          transition: "transform 0.3s ease",
        }}
      >
        {/* Logo */}
        <div style={{
          padding: "24px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.1)"
        }}>
          <h1 style={{
            color: "#F5A623",
            fontSize: "22px",
            fontWeight: 700,
            margin: 0
          }}>
            🏪 BarrioDesk
          </h1>
          <p style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: "12px",
            margin: "4px 0 0 0"
          }}>
            Gestión de Kioscos
          </p>
        </div>

        {/* Navegación */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  marginBottom: "4px",
                  textDecoration: "none",
                  color: isActive ? "#1E3A5F" : "rgba(255,255,255,0.8)",
                  background: isActive ? "#F5A623" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: "15px",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: "18px" }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer del sidebar */}
        <div style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.4)",
          fontSize: "12px"
        }}>
          BarrioDesk v1.0 · Tucumán 🇦🇷
        </div>
      </aside>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Header mobile */}
        {isMobile && (
          <header style={{
            background: "#1E3A5F",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                fontSize: "24px",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              ☰
            </button>
            <span style={{ color: "#F5A623", fontWeight: 700, fontSize: "18px" }}>
              🏪 BarrioDesk
            </span>
            <div style={{ width: "32px" }} />
          </header>
        )}

        {/* Página actual */}
        <main style={{ flex: 1, padding: "24px", maxWidth: "1400px", width: "100%" }}>
          {children}
        </main>
      </div>
    </div>
  );
}