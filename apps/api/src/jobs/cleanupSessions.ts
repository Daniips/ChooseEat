// apps/api/src/jobs/cleanupSessions.ts
import { TTL_DAYS } from "../data/sessionRepo";
import { mem } from "../data/sessionRepo";

const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60;


export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, session] of mem.entries()) {
    const age = now - new Date(session.createdAt).getTime();
    
    if (age > TTL_SECONDS * 1000) {
      mem.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.info(`[Cleanup] Removed ${cleaned} expired session(s) from memory`);
  }

  return cleaned;
}
