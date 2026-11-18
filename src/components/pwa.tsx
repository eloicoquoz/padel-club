"use client";

import { useEffect } from "react";

/** Enregistre le service worker (installation sur l'écran d'accueil + page hors-ligne). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
