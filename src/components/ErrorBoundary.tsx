"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary capturó un error:", error, errorInfo);
  }

  handleClearCacheAndReload = async () => {
    // Limpiar caches del navegador
    if ("caches" in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (error) {
        console.error("Error limpiando caches:", error);
      }
    }

    // Desregistrar Service Workers
    if ("serviceWorker" in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      } catch (error) {
        console.error("Error desregistrando SW:", error);
      }
    }

    // Limpiar localStorage y sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (error) {
      console.error("Error limpiando storage:", error);
    }

    // Recargar la página
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#F8F9FA",
            padding: "24px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "40px",
              maxWidth: "480px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: "60px", marginBottom: "16px" }}>⚠️</div>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: "800",
                color: "#1E3A5F",
                marginBottom: "8px",
              }}
            >
              Algo salió mal
            </h1>
            <p
              style={{
                color: "#718096",
                fontSize: "14px",
                marginBottom: "24px",
                lineHeight: 1.5,
              }}
            >
              Hubo un error al cargar la aplicación. Esto puede deberse a una
              caché desactualizada o datos corruptos.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <button
                onClick={this.handleClearCacheAndReload}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "#1E3A5F",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                  minHeight: "48px",
                }}
              >
                🔄 Limpiar caché y recargar
              </button>

              <button
                onClick={this.handleReload}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "white",
                  color: "#1E3A5F",
                  border: "2px solid #1E3A5F",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                  minHeight: "48px",
                }}
              >
                🔁 Solo recargar
              </button>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div
                style={{
                  marginTop: "24px",
                  padding: "12px",
                  background: "#FFF5F5",
                  borderRadius: "8px",
                  textAlign: "left",
                  fontSize: "12px",
                  color: "#E74C3C",
                  fontFamily: "monospace",
                  maxHeight: "200px",
                  overflow: "auto",
                }}
              >
                <strong>Error:</strong> {this.state.error.message}
                <br />
                <strong>Stack:</strong> {this.state.error.stack}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
