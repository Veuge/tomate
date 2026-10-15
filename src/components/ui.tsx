import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "destructive";

const variants: Record<Variant, string> = {
  primary: "bg-fg text-bg hover:opacity-90",
  secondary: "bg-surface-2 text-fg hover:bg-line",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  danger: "text-red-500 hover:bg-red-500/10",
  destructive: "bg-red-500 text-white hover:bg-red-600",
};

export function Button({
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 h-10 text-sm font-medium transition disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        className,
      )}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-2xl bg-surface border border-line p-4 sm:p-5", className)}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{children}</h2>
      {right}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-accent" : "bg-line")}
    >
      <span
        className={cx(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cx("inline-flex rounded-xl bg-surface-2 p-1 gap-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex-1 rounded-lg px-3 h-8 text-sm font-medium transition whitespace-nowrap",
            value === o.value ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Bottom sheet on mobile, centered dialog on larger screens. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-label={title}
        className="relative w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface border border-line p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-fg p-1 -m-1">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-muted mb-6">{message}</p>
      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <Button className="sm:flex-1 h-11" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="destructive" className="sm:flex-1 h-11" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
