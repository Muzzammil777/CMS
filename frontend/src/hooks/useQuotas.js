import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../api/apiBase";

const CACHE = {
  data: null,
  timestamp: 0,
};
const TTL_MS = 30_000;

const DEFAULT_QUOTAS = [
  { id: "gov", name: "Government Quota", code: "GOV" },
  { id: "mgmt", name: "Management Quota", code: "MGMT" },
  { id: "nri", name: "NRI Quota", code: "NRI" }
];

export function useQuotas() {
  const [quotas, setQuotas] = useState(CACHE.data || DEFAULT_QUOTAS);
  const [loading, setLoading] = useState(!CACHE.data);

  const fetchQuotas = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && CACHE.data && now - CACHE.timestamp < TTL_MS) {
      setQuotas(CACHE.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${API_BASE}/settings/quotas`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) && data.length > 0 ? data : DEFAULT_QUOTAS;

      CACHE.data = list;
      CACHE.timestamp = Date.now();
      setQuotas(list);
    } catch (err) {
      console.warn("[useQuotas] fetch failed, using defaults:", err.message);
      setQuotas(CACHE.data || DEFAULT_QUOTAS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotas();
  }, [fetchQuotas]);

  return { quotas, loading, refetch: () => fetchQuotas(true) };
}
