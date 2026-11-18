import { after } from "next/server";

/**
 * Exécute une tâche après l'envoi de la réponse (push, Teams…) sans que la fonction
 * serverless soit coupée avant la fin. Hors requête (scripts, seed) : simple fire & forget.
 */
export function background(task: () => Promise<unknown>) {
  try {
    after(() => task().catch((e) => console.warn("[background]", e)));
  } catch {
    void task().catch((e) => console.warn("[background]", e));
  }
}
