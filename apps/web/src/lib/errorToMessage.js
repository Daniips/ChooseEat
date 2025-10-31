// apps/web/src/lib/errorToMessage.js
import { HttpError, TimeoutError, NetworkError, AbortRequestError } from "./errors";

export function errorToMessage(err, t, overrides = {}) {
  const keys = {
    notFound:  "errors.not_found",
    conflict:  "errors.conflict",
    badRequest:"errors.bad_request",
    server:    "errors.server",
    timeout:   "errors.timeout",
    aborted:   "errors.aborted",
    network:   "errors.network_down",
    generic:   "errors.generic",
    ...overrides
  };

  if (err instanceof TimeoutError)       return t(keys.timeout);
  if (err instanceof AbortRequestError)  return t(keys.aborted);
  if (err instanceof NetworkError)       return t(keys.network);

  if (err instanceof HttpError) {
    const s = err.status || 0;
    if (s === 404) return t(keys.notFound);
    if (s === 409) return t(keys.conflict);
    if (s === 400) return t(keys.badRequest);
    if (s >= 500)  return t(keys.server);
  }

  return t(keys.generic);
}
