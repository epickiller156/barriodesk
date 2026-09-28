"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registrado:", registration.scope);
        })
        .catch((error) => {
          console.error("Error registrando SW:", error);
        });
    }
  }, []);

  return null;
}
