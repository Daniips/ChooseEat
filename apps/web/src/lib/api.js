export const API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * Envuelve fetch y lanza errores con detalle de status + body
 * path: string empezando por /api/...
 */
export async function api(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options
    });

    if (!res.ok) {
        let msg = "";
        try { msg = await res.text(); } catch {
            //nada
        }
        throw new Error(`[${res.status}] ${res.statusText} :: ${msg || url}`);
    }
    // si no hay body, devuelve null
    try { return await res.json(); } catch { return null; }
}
