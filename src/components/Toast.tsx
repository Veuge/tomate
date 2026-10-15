import { useEffect } from "react";
import { create } from "zustand";
import { CircleAlert, CircleCheck, CloudOff, LoaderCircle, X } from "lucide-react";
import { cx } from "./ui";

type Kind = "pending" | "success" | "info" | "error";

export interface Toast {
  id: number;
  kind: Kind;
  text: string;
  detail?: string;
}

const useToast = create<{ toast: Toast | null }>(() => ({ toast: null }));
let nextId = 1;

/** Shows a toast (replacing any current one) and returns its id. */
export function showToast(t: Omit<Toast, "id">): number {
  const id = nextId++;
  useToast.setState({ toast: { ...t, id } });
  return id;
}

/** Updates a toast in place, if it's still the one showing. */
export function updateToast(id: number, t: Omit<Toast, "id">): void {
  if (useToast.getState().toast?.id === id) useToast.setState({ toast: { ...t, id } });
}

const dismiss = () => useToast.setState({ toast: null });

const ICON = {
  pending: <LoaderCircle size={18} className="animate-spin text-muted" />,
  success: <CircleCheck size={18} className="text-break" />,
  info: <CloudOff size={18} className="text-muted" />,
  error: <CircleAlert size={18} className="text-red-500" />,
};

const DURATION: Record<Kind, number | null> = { pending: null, success: 3000, info: 5000, error: 8000 };

/** Mount once. The live region stays in the DOM so screen readers announce changes. */
export function Toaster() {
  const toast = useToast((s) => s.toast);

  useEffect(() => {
    const ms = toast && DURATION[toast.kind];
    if (!ms) return;
    const id = setTimeout(dismiss, ms);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] md:bottom-6 md:pl-60"
    >
      {toast && (
        <div
          className={cx(
            "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border bg-surface p-3 pl-4 shadow-xl",
            toast.kind === "error" ? "border-red-500/40" : "border-line",
          )}
        >
          <span className="mt-0.5 shrink-0">{ICON[toast.kind]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{toast.text}</p>
            {toast.detail && <p className="mt-0.5 text-xs text-muted break-words">{toast.detail}</p>}
          </div>
          {toast.kind !== "pending" && (
            <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 p-0.5 text-muted hover:text-fg">
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
