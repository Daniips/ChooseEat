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
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}


export function getParticipant(sessionId, { touch = true } = {}) {
  const map = readJSON(STORAGE_KEY, {});
  const p = map?.[sessionId];
  if (!p) return null;
  if (p.expiresAt && p.expiresAt < now()) {
    delete map[sessionId];
    writeJSON(STORAGE_KEY, map);
    // también lo sacamos del índice
    const idx = readJSON(INDEX_KEY, []).filter((s) => s.id !== sessionId);
    writeJSON(INDEX_KEY, idx);
    return null;
  }
  if (touch) {
    p.lastSeen = now();
    map[sessionId] = p;
    writeJSON(STORAGE_KEY, map);
    rememberSession(sessionId); 
  }
  return p;
}

export function getParticipantId(sessionId) {
  return getParticipant(sessionId)?.id ?? null;
}

export function setParticipant(sessionId, participant, invitePath, { ttlDays = TTL_DAYS } = {}) {
  const map = readJSON(STORAGE_KEY, {});
  const ts = now();
  map[sessionId] = {
    ...participant,
    lastSeen: ts,
    expiresAt: ts + dayMs(ttlDays),
  };
  writeJSON(STORAGE_KEY, map);

  rememberSession(sessionId, invitePath);
}

export function touchParticipant(sessionId, { ttlDays = TTL_DAYS } = {}) {
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
  rememberSession(sessionId);
}

export function migrateFromLegacy(currentSessionId) {
  try {
    const legacyPid = localStorage.getItem("ce_sessionId");
    const legacyP = readJSON("ce_participant", null);
    if (legacyPid && legacyP && currentSessionId && legacyPid === currentSessionId) {
      setParticipant(currentSessionId, legacyP, `/s/${currentSessionId}`);
    }
  } catch { /* noop */ }
  try {
    localStorage.removeItem("ce_sessionId");
    localStorage.removeItem("ce_participant");
  } catch { /* noop */ }
}

export function rememberSession(sessionId, invitePath) {
  if (!sessionId) return;
  const list = readJSON(INDEX_KEY, []);
  const ts = now();
  const path = invitePath || `/s/${sessionId}`;

  const idx = list.findIndex((s) => s.id === sessionId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], invitePath: path, lastSeen: ts };
  } else {
    list.push({ id: sessionId, invitePath: path, lastSeen: ts });
  }

  const cutoff = ts - dayMs(TTL_DAYS);
  const cleaned = list
    .filter((s) => (s.lastSeen ?? 0) >= cutoff)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, MAX_SESSIONS);

  writeJSON(INDEX_KEY, cleaned);
}

export function listRememberedSessions() {
  const list = readJSON(INDEX_KEY, []);
  return [...list].sort((a, b) => b.lastSeen - a.lastSeen);
}

export function forgetSession(sessionId, { removeParticipant = false } = {}) {
  const list = readJSON(INDEX_KEY, []).filter((s) => s.id !== sessionId);
  writeJSON(INDEX_KEY, list);

  if (removeParticipant) {
    const map = readJSON(STORAGE_KEY, {});
    delete map[sessionId];
    writeJSON(STORAGE_KEY, map);
  }
}


export function pruneParticipants({ maxItems = MAX_SESSIONS, maxAgeDays = TTL_DAYS } = {}) {
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
}

//Olvidar todo (no implementado)
export function clearAllChooseEatData() {
  writeJSON(STORAGE_KEY, {});
  writeJSON(INDEX_KEY, []);
}
