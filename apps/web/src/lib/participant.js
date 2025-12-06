// apps/web/src/lib/participant.js

const STORAGE_KEY = "ce_participants_v2";
const INDEX_KEY   = "ce_sessions_index_v1";

const MAX_SESSIONS = 10;
const TTL_DAYS     = 7;

const now   = () => Date.now();
const dayMs = (d) => d * 864e5;

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "") ?? fallback; }
  catch { return fallback; }
}
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`writeJSON failed for key "${key}":`, e);
    return false;
  }
}

export function getParticipant(sessionId, { touch = true } = {}) {
  try {
    const map = readJSON(STORAGE_KEY, {});
    const p = map?.[sessionId];
    if (!p) return null;

    if (p.expiresAt && p.expiresAt < now()) {
      delete map[sessionId];
      writeJSON(STORAGE_KEY, map);
      const idx = readJSON(INDEX_KEY, []).filter((s) => s.id !== sessionId);
      writeJSON(INDEX_KEY, idx);
      return null;
    }

    if (touch) {
      p.lastSeen = now();
      map[sessionId] = p;
      writeJSON(STORAGE_KEY, map);
    }
    return p;
  } catch (e) {
    console.error("getParticipant failed:", e);
    return null;
  }
}

export function getParticipantId(sessionId) {
  try {
    return getParticipant(sessionId)?.id ?? null;
  } catch (e) {
    console.error("getParticipantId failed:", e);
    return null;
  }
}

export function setParticipant(sessionId, participant, invitePath, { ttlDays = TTL_DAYS } = {}) {
  try {
    const map = readJSON(STORAGE_KEY, {});
    const ts = now();
    map[sessionId] = {
      ...participant,
      lastSeen: ts,
      expiresAt: ts + dayMs(ttlDays),
    };
    writeJSON(STORAGE_KEY, map);

  } catch (e) {
    console.error("setParticipant failed:", e);
  }
}

export function touchParticipant(sessionId, { ttlDays = TTL_DAYS } = {}) {
  try {
    const map = readJSON(STORAGE_KEY, {});
    const p = map?.[sessionId];
    if (!p) return;
    const ts = now();
    map[sessionId] = {
      ...p,
      lastSeen: ts,
      expiresAt: ts + dayMs(ttlDays),
    };
    writeJSON(STORAGE_KEY, map);
  } catch (e) {
    console.error("touchParticipant failed:", e);
  }
}

export function migrateFromLegacy(currentSessionId) {
  try {
    const legacyPid = localStorage.getItem("ce_sessionId");
    const legacyP = readJSON("ce_participant", null);
    if (legacyPid && legacyP && currentSessionId && legacyPid === currentSessionId) {
      setParticipant(currentSessionId, legacyP, `/s/${currentSessionId}`);
    }
  } catch (e) {
    console.error("migrateFromLegacy read failed:", e);
  }
  try {
    localStorage.removeItem("ce_sessionId");
    localStorage.removeItem("ce_participant");
  } catch (e) {
    console.error("migrateFromLegacy cleanup failed:", e);
  }
}

export function rememberSession(sessionId, invitePath, name) {
  try {
    if (!sessionId) return;
    const list = readJSON(INDEX_KEY, []);
    const ts = now();
    const path = invitePath || `/s/${sessionId}`;

    const idx = list.findIndex((s) => s.id === sessionId);
    if (idx >= 0) {
    const existingName = list[idx].name;
      list[idx] = { 
        ...list[idx], 
        invitePath: path, 
        lastSeen: ts,
        name: name !== undefined ? name : existingName
      };
    } else {
      list.push({ id: sessionId, invitePath: path, lastSeen: ts, name });
    }
    
    const cutoff = ts - dayMs(TTL_DAYS);
    const cleaned = list
      .filter((s) => (s.lastSeen ?? 0) >= cutoff)
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, MAX_SESSIONS);

    writeJSON(INDEX_KEY, cleaned);
  } catch (e) {
    console.error("rememberSession failed:", e);
  }
}

export function listRememberedSessions() {
  try {
    const list = readJSON(INDEX_KEY, []);
    return [...list].sort((a, b) => b.lastSeen - a.lastSeen);
  } catch (e) {
    console.error("listRememberedSessions failed:", e);
    return [];
  }
}

export function forgetSession(sessionId, { removeParticipant = false } = {}) {
  try {
    const list = readJSON(INDEX_KEY, []).filter((s) => s.id !== sessionId);
    writeJSON(INDEX_KEY, list);

    if (removeParticipant) {
      const map = readJSON(STORAGE_KEY, {});
      delete map[sessionId];
      writeJSON(STORAGE_KEY, map);
    }
  } catch (e) {
    console.error("forgetSession failed:", e);
  }
}

export function pruneParticipants({ maxItems = MAX_SESSIONS, maxAgeDays = TTL_DAYS } = {}) {
  try {
    const ts = now();
    const cutoff = ts - dayMs(maxAgeDays);

    const map = readJSON(STORAGE_KEY, {});
    for (const sid of Object.keys(map)) {
      const p = map[sid];
      const expired = (p?.expiresAt && p.expiresAt < ts) || ((p?.lastSeen ?? 0) < cutoff);
      if (expired) delete map[sid];
    }
    writeJSON(STORAGE_KEY, map);

    const list = readJSON(INDEX_KEY, [])
      .filter((s) => (s.lastSeen ?? 0) >= cutoff && map[s.id])
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, maxItems);

    writeJSON(INDEX_KEY, list);
  } catch (e) {
    console.error("pruneParticipants failed:", e);
  }
}

export function clearAllChooseEatData() {
  try {
    writeJSON(STORAGE_KEY, {});
    writeJSON(INDEX_KEY, []);
  } catch (e) {
    console.error("clearAllChooseEatData failed:", e);
  }
}
