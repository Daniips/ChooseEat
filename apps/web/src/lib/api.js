// apps/web/src/lib/api.js
export const API_BASE = import.meta.env.VITE_API_URL || "";


export async function api(path, options = {}) {
  const { timeoutMs, ...rest } = options || {};
  const url = `${API_BASE}${path}`;

  const ctrl = new AbortController();
  const userSignal = rest.signal;
  const signals = [ctrl.signal, userSignal].filter(Boolean);
  const signal = signals.length === 1 ? signals[0] : mergeSignals(signals);

  const timer = typeof timeoutMs === "number" && timeoutMs > 0
    ? setTimeout(() => ctrl.abort(new DOMException("Timeout", "AbortError")), timeoutMs)
    : null;

  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(rest.headers || {}) },
      ...rest,
      signal
    });

    if (!res.ok) {
      let msg = "";
      try { msg = await res.text(); } catch { /* ignore */ }
      throw new Error(`[${res.status}] ${res.statusText} :: ${msg || url}`);
    }
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  } catch (e) {
    const name = e?.name || "";
    const reason = e?.message || e;
    const isAbort = name === "AbortError";
    const tag = isAbort ? "ABORT/TIMEOUT" : "NETWORK";
    throw new Error(`[${tag}] ${url} :: ${reason}`);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function mergeSignals(signals) {
  const ctrl = new AbortController();
  const onAbort = (evt) => ctrl.abort(evt?.target?.reason);
  for (const s of signals) {
    if (s?.aborted) { ctrl.abort(s.reason); break; }
    s?.addEventListener?.("abort", onAbort, { once: true });
  }
  return ctrl.signal;
}
