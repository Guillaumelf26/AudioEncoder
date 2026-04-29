import { useEffect } from "react";
import clsx from "clsx";
import { tauriClient, isTauriAvailable } from "@/shared/api/tauriClient";
import { useAppStore } from "@/shared/store/appStore";

const AUTO_DISMISS_MS = 6000;

export function ToastViewport() {
  const toasts = useAppStore((state) => state.toasts);
  const dismissToast = useAppStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toasts.length) {
      return;
    }
    const timers = toasts
      .filter((toast) => toast.level !== "error")
      .map((toast) => {
        const remaining = AUTO_DISMISS_MS - (Date.now() - toast.createdAt);
        const delay = Math.max(800, remaining);
        return window.setTimeout(() => dismissToast(toast.id), delay);
      });
    return () => {
      for (const id of timers) {
        window.clearTimeout(id);
      }
    };
  }, [toasts, dismissToast]);

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <article key={toast.id} className={clsx("toast", `toast-${toast.level}`)}>
          <header className="toast-header">
            <strong>{toast.title}</strong>
            <button
              type="button"
              className="toast-close"
              aria-label="Fermer la notification"
              onClick={() => dismissToast(toast.id)}
            >
              ×
            </button>
          </header>
          {toast.message ? <p className="toast-message">{toast.message}</p> : null}
          {toast.action && isTauriAvailable() ? (
            <button
              type="button"
              className="btn-secondary toast-action"
              onClick={() => {
                tauriClient
                  .revealInExplorer(toast.action!.path)
                  .catch(() => undefined);
              }}
            >
              {toast.action.label}
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}
