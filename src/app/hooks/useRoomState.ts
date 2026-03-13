"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { RoomState } from "../types";

export function useRoomState(code: string | null, intervalMs = 1500) {
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchState = useCallback(async () => {
    if (!code) return;
    try {
      const res = await fetch(`/api/rooms/${code}`);
      if (!res.ok) {
        setError("Sala não encontrada");
        return;
      }
      const data = await res.json();
      setState(data);
      setError(null);
    } catch {
      setError("Erro de ligação");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (!code) return;
    fetchState();
    intervalRef.current = setInterval(fetchState, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [code, intervalMs, fetchState]);

  return { state, error, loading, refetch: fetchState };
}
