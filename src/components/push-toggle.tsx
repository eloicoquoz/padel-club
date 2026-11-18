"use client";

import { useEffect, useState } from "react";
import { removePushSubscriptionAction, savePushSubscriptionAction } from "@/lib/actions/app";
import { useT } from "@/lib/i18n/client";
import { Icon } from "./ui";

type Status = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const { t } = useT();
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // iOS Safari : push seulement une fois l'app ajoutée à l'écran d'accueil.
        const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia("(display-mode: standalone)").matches;
        setStatus(iOS && !standalone ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setStatus("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    })();
  }, [publicKey]);

  const enable = async () => {
    if (!publicKey) return;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setStatus("denied");
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const json = sub.toJSON();
      await savePushSubscriptionAction({ endpoint: sub.endpoint, keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth } }, navigator.userAgent.slice(0, 200));
      setStatus("on");
    } catch (e) {
      console.warn(e);
      setStatus("off");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  };

  const p = t.push;
  const hint =
    status === "needs-install" ? p.needsInstall : status === "unsupported" ? p.unsupported : status === "denied" ? p.denied : status === "on" ? p.onHint : p.offHint;

  return (
    <div className="card flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${status === "on" ? "bg-green-bg text-green" : "bg-bg text-muted"}`}>
            <Icon name="flame" size={18} />
          </div>
          <div>
            <div className="text-sm font-extrabold">{p.title}</div>
            <div className="text-[11px] text-muted">{hint}</div>
          </div>
        </div>
        {(status === "on" || status === "off") && (
          <button
            type="button"
            disabled={busy}
            onClick={status === "on" ? disable : enable}
            className={`btn btn-sm shrink-0 ${status === "on" ? "bg-surface-2 border border-border-2 text-muted" : "bg-text text-bg"}`}
          >
            {busy ? "…" : status === "on" ? p.disable : p.enable}
          </button>
        )}
      </div>
    </div>
  );
}
