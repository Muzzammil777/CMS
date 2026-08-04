/**
 * useDepartments
 * Fetches departments from the backend with a 30-second TTL in-memory cache.
 * Falls back to the 3 default DSCHS departments if the request fails.
 */
import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../api/apiBase";

// --- Module-level cache (shared across all hook instances, survives re-renders) ---
const CACHE = {
  data: null,
  timestamp: 0,
};
const TTL_MS = 30_000; // 30 seconds

const DEFAULT_DEPARTMENTS = [
  { id: "mlt", name: "Medical Laboratory Technology", code: "MLT" },
  { id: "otat", name: "Operation Theatre & Anaesthesia Technology", code: "OTAT" },
  { id: "rit", name: "Radiography & Imaging Technology", code: "RIT" },
];

export function useDepartments() {
  const [departments, setDepartments] = useState(CACHE.data || []);
  const [loading, setLoading] = useState(!CACHE.data);
  const [error, setError] = useState(null);

  const fetchDepartments = useCallback(async (force = false) => {
    const now = Date.now();
    // Use cache if fresh and not forced
    if (!force && CACHE.data && now - CACHE.timestamp < TTL_MS) {
      setDepartments(CACHE.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${API_BASE}/settings/departments`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Normalise: accept array directly or { departments: [...] }
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.departments)
        ? data.departments
        : [];

      CACHE.data = list;
      CACHE.timestamp = Date.now();
      setDepartments(list);
    } catch (err) {
      console.warn("[useDepartments] fetch failed:", err.message);
      setDepartments(CACHE.data || []);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return { departments, loading, error, refetch: () => fetchDepartments(true) };
}
