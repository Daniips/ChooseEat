// apps/web/src/lib/api.js
import { HttpError, TimeoutError, NetworkError, AbortRequestError } from "./errors";

export const API_BASE = import.meta.env.VITE_API_URL || "";

export async function api(path, options = {}) {
  const { timeoutMs, ...rest } = options || {};
  const url = `${API_BASE}${path}`;

  const ctrl = new AbortController();
  const userSignal = rest.signal;
  const signals = [ctrl.signal, userSignal].filter(Boolean);
  const signal = signals.length === 1 ? signals[0] : mergeSignals(signals);

  let didTimeout = false;
  const timer =
    typeof timeoutMs === "number" && timeoutMs > 0
      ? setTimeout(() => {
          didTimeout = true;
          ctrl.abort();
        }, timeoutMs)
      : null;

  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(rest.headers || {}),
      },
      ...rest,
      signal,
    });

    if (res.status === 204) return null;
    const raw = await res.text();
    const json = safeParseJSON(raw);

    if (!res.ok) {
      throw new HttpError(
        json?.error || json?.message || res.statusText || "Request failed",
        {
          status: res.status,
          code: json?.code || null,
          url,
          details: json || (raw ? { raw } : null),
        }
      );
    }

    return json ?? null;
  } catch (e) {
    if (e instanceof HttpError) throw e;

    if (e?.name === "AbortError") {
      if (didTimeout) {
        throw new TimeoutError("Request timed out", { url });
      }
      throw new AbortRequestError("Request aborted", { url, details: e });
    }

    throw new NetworkError(e?.message || "Network error", { url, details: e });
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

function safeParseJSON(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}
