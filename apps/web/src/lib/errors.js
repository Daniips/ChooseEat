// apps/web/src/lib/errors.js
export class AppError extends Error {
  constructor(message, { kind = "APP", code = null, status = null, url = null, details = null } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.kind = kind;
    this.code = code;
    this.status = status;
    this.url = url;
    this.details = details;
  }
}

export class HttpError extends AppError {
  constructor(message, opts = {}) {
    super(message, { kind: "HTTP", ...opts });
  }
}

export class NetworkError extends AppError {
  constructor(message, opts = {}) {
    super(message, { kind: "NETWORK", ...opts });
  }
}

export class TimeoutError extends AppError {
  constructor(message = "Request timed out", opts = {}) {
    super(message, { kind: "TIMEOUT", ...opts });
  }
}

export class AbortRequestError extends AppError {
  constructor(message = "Request aborted", opts = {}) {
    super(message, { kind: "ABORT", ...opts });
  }
}
