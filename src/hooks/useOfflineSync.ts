"use client";

import { useState, useEffect, useCallback } from "react";
import { storage } from "@/lib/storage";

interface PendingSale {
  id: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    subtotal: number;
    discount: number;
  }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  customerId?: string;
  isFiado: boolean;
  createdAt: string;
}

const STORAGE_KEY = "barriodesk_pending_sales";

export function useOfflineSync() {
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  // Load pending sales from localStorage de forma segura
  useEffect(() => {
    const stored = storage.get<PendingSale[]>(STORAGE_KEY, []);
    setPendingSales(stored);
  }, []);

  // Save to localStorage whenever pendingSales changes de forma segura
  useEffect(() => {
    if (pendingSales.length > 0) {
      storage.set(STORAGE_KEY, pendingSales);
    } else {
      storage.remove(STORAGE_KEY);
    }
  }, [pendingSales]);

  const addPendingSale = useCallback((sale: Omit<PendingSale, "id" | "createdAt">) => {
    const newSale: PendingSale = {
      ...sale,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setPendingSales((prev) => [...prev, newSale]);
    return newSale;
  }, []);

  const removePendingSale = useCallback((id: string) => {
    setPendingSales((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const syncPendingSales = useCallback(async () => {
    if (pendingSales.length === 0) return { synced: 0, failed: 0 };
    if (!navigator.onLine) return { synced: 0, failed: 0 };

    setIsSyncing(true);
    let synced = 0;
    let failed = 0;
    const failedSales: PendingSale[] = [];

    for (const sale of pendingSales) {
      try {
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sale),
        });
        if (res.ok) {
          synced++;
        } else {
          failed++;
          failedSales.push(sale);
        }
      } catch {
        failed++;
        failedSales.push(sale);
      }
    }

    setPendingSales(failedSales);
    setIsSyncing(false);
    setLastSyncAt(new Date());

    return { synced, failed };
  }, [pendingSales]);

  // Auto-sync when online
  useEffect(() => {
    const handleOnline = () => {
      if (pendingSales.length > 0) {
        syncPendingSales();
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [pendingSales, syncPendingSales]);

  return {
    pendingSales,
    isSyncing,
    lastSyncAt,
    addPendingSale,
    removePendingSale,
    syncPendingSales,
    hasPending: pendingSales.length > 0,
  };
}
