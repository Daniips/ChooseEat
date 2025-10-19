// Helper to save the sesions of the participant

const MAP_KEY = "ce_participants"; 
const objKey = (sid) => `ce_participant_${sid}`;

export function migrateFromLegacy(sessionId) {
  try {
    const legacy = JSON.parse(localStorage.getItem("ce_participant") || "null");
    const legacySid = localStorage.getItem("ce_sessionId");
    if (legacy && legacySid === sessionId) {
      setParticipant(sessionId, legacy);
      localStorage.removeItem("ce_participant");
      localStorage.removeItem("ce_sessionId");
    }
  } catch {
    // noop
  }
}

export function getParticipantId(sessionId) {
  try {
    const map = JSON.parse(localStorage.getItem(MAP_KEY) || "{}");
    return map[sessionId] || null;
  } catch {
    return null;
  }
}

export function getParticipant(sessionId) {
  try {
    return JSON.parse(localStorage.getItem(objKey(sessionId)) || "null");
  } catch {
    return null;
  }
}

export function setParticipant(sessionId, participant) {
  try {
    const map = JSON.parse(localStorage.getItem(MAP_KEY) || "{}");
    map[sessionId] = participant?.id;
    localStorage.setItem(MAP_KEY, JSON.stringify(map));
    localStorage.setItem(objKey(sessionId), JSON.stringify(participant));
  } catch {
    // noop
  }
}

export function clearParticipant(sessionId) {
  try {
    const map = JSON.parse(localStorage.getItem(MAP_KEY) || "{}");
    delete map[sessionId];
    localStorage.setItem(MAP_KEY, JSON.stringify(map));
    localStorage.removeItem(objKey(sessionId));
  } catch {
    // noop
  }
}
