"use client";

import { useEffect, useState } from "react";

export default function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("SW registrado:", reg.scope);
          setRegistration(reg);

          // Verificar si hay una nueva versión disponible
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // Hay una nueva versión disponible
                  setUpdateAvailable(true);
                }
              });
            }
          });

          // Verificar actualizaciones cada 60 segundos
          setInterval(() => {
            reg.update();
          }, 60000);
        })
        .catch((error) => {
          console.error("Error registrando SW:", error);
        });

      // Escuchar mensajes del Service Worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "CACHES_CLEARED") {
          console.log("Cachés limpiados por el Service Worker");
        }
      });

      // Manejar errores de carga de chunks
      const handleChunkError = (error: ErrorEvent) => {
        if (error.message && (
          error.message.includes("Loading chunk") ||
          error.message.includes("ChunkLoadError") ||
          error.message.includes("Failed to fetch dynamically imported module")
        )) {
          console.error("Error de carga de chunk detectado:", error);
          // Intentar recargar la página una vez
          if (!sessionStorage.getItem("chunk_error_reloaded")) {
            sessionStorage.setItem("chunk_error_reloaded", "true");
            window.location.reload();
          }
        }
      };

      window.addEventListener("error", handleChunkError);

      // Limpiar la bandera de recarga después de un tiempo
      const clearReloadFlag = () => {
        sessionStorage.removeItem("chunk_error_reloaded");
      };
      setTimeout(clearReloadFlag, 30000);

      return () => {
        window.removeEventListener("error", handleChunkError);
      };
    }
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // Limpiar storage viejo que pueda causar conflictos
      try {
      // Mantener solo las claves esenciales
      const keysToKeep = ["auth_token", "pwa-install-dismissed"];
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error("Error limpiando localStorage:", error);
    }
      
      // Enviar mensaje al Service Worker para que se active
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      // Recargar la página
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#1E3A5F",
        color: "white",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        zIndex: 1000,
        boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
        <span style={{ fontSize: "24px" }}>🔄</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: "14px" }}>Nueva versión disponible</div>
          <div style={{ fontSize: "12px", opacity: 0.8 }}>
            Actualizá para obtener las últimas mejoras
          </div>
        </div>
      </div>
      <button
        onClick={handleUpdate}
        style={{
          background: "#F5A623",
          border: "none",
          color: "#1E3A5F",
          padding: "8px 20px",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: "13px",
          minHeight: "40px",
        }}
      >
        Actualizar
      </button>
    </div>
  );
}
