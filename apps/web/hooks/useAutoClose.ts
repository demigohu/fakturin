"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export type AutoCloseState = "closing" | "unavailable";

const RETRY_MS = 10_000;

// Shared across every overdue vault on the page: one keeper call closes all of them.
let inflight: Promise<boolean | null> | null = null;
let lastCall = 0;
let unavailable = false;

/** POST /api/keeper; true when something was closed, null when no relayer is configured. */
function requestClose(): Promise<boolean | null> {
  if (unavailable) return Promise.resolve(null);
  if (inflight) return inflight;
  if (Date.now() - lastCall < RETRY_MS) return Promise.resolve(false);
  lastCall = Date.now();
  inflight = fetch("/api/keeper", { method: "POST" })
    .then(async (res) => {
      if (res.status === 503) {
        unavailable = true;
        return null;
      }
      const body = (await res.json().catch(() => ({}))) as { closed?: number };
      return (body.closed ?? 0) > 0;
    })
    .catch(() => false)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * While `due` (a vault this screen shows is past its deadline), asks the keeper to close it,
 * retrying until the chain catches up. Mirrors the Chainlink CRE keeper cron, so nobody presses
 * "Mark default" or "Cancel funding". Returns "unavailable" when no keeper relayer is configured.
 */
export function useAutoClose(due: boolean): AutoCloseState {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AutoCloseState>(unavailable ? "unavailable" : "closing");

  useEffect(() => {
    if (!due) return;
    let alive = true;
    const tick = () =>
      requestClose().then((closed) => {
        if (!alive) return;
        if (closed === null) setState("unavailable");
        else if (closed) queryClient.invalidateQueries();
      });
    tick();
    const t = setInterval(tick, RETRY_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [due, queryClient]);

  return state;
}
