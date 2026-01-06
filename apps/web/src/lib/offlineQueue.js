// apps/web/src/lib/offlineQueue.js
// Sistema de cola para votos offline

const QUEUE_KEY = (sessionId) => `offline_votes_${sessionId}`;

/**
 * Añade un voto a la cola offline
 */
export function addVoteToQueue(sessionId, participantId, restaurantId, choice) {
  if (!sessionId || !participantId || !restaurantId || !choice) return;
  
  try {
    const queue = getQueue(sessionId);
    const vote = {
      participantId,
      restaurantId,
      choice,
      timestamp: Date.now(),
    };
    
    // Evitar duplicados (mismo restaurante y participante)
    const exists = queue.some(
      (v) => v.restaurantId === restaurantId && v.participantId === participantId
    );
    
    if (!exists) {
      queue.push(vote);
      localStorage.setItem(QUEUE_KEY(sessionId), JSON.stringify(queue));
    }
  } catch (e) {
    console.error("Failed to add vote to queue:", e);
  }
}

/**
 * Obtiene la cola de votos pendientes
 */
export function getQueue(sessionId) {
  if (!sessionId) return [];
  
  try {
    const stored = localStorage.getItem(QUEUE_KEY(sessionId));
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to get queue:", e);
    return [];
  }
}

/**
 * Obtiene el número de votos pendientes
 */
export function getQueueSize(sessionId) {
  return getQueue(sessionId).length;
}

/**
 * Limpia la cola de votos
 */
export function clearQueue(sessionId) {
  if (!sessionId) return;
  
  try {
    localStorage.removeItem(QUEUE_KEY(sessionId));
  } catch (e) {
    console.error("Failed to clear queue:", e);
  }
}

/**
 * Elimina un voto específico de la cola
 */
export function removeVoteFromQueue(sessionId, restaurantId, participantId) {
  if (!sessionId) return;
  
  try {
    const queue = getQueue(sessionId);
    const filtered = queue.filter(
      (v) => !(v.restaurantId === restaurantId && v.participantId === participantId)
    );
    localStorage.setItem(QUEUE_KEY(sessionId), JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to remove vote from queue:", e);
  }
}

/**
 * Procesa la cola de votos pendientes enviándolos al servidor
 * Retorna el número de votos procesados exitosamente
 */
export async function processQueue(sessionId, apiFunction) {
  if (!sessionId || !apiFunction) return 0;
  
  const queue = getQueue(sessionId);
  if (queue.length === 0) return 0;
  
  let successCount = 0;
  const failed = [];
  
  for (const vote of queue) {
    try {
      await apiFunction(`/api/sessions/${sessionId}/votes`, {
        method: "POST",
        body: JSON.stringify({
          participantId: vote.participantId,
          restaurantId: vote.restaurantId,
          choice: vote.choice,
        }),
      });
      
      // Voto enviado exitosamente
      successCount++;
      removeVoteFromQueue(sessionId, vote.restaurantId, vote.participantId);
    } catch (e) {
      // Si falla, mantenerlo en la cola para reintentar después
      console.warn("Failed to send queued vote:", vote, e);
      failed.push(vote);
    }
  }
  
  return successCount;
}

