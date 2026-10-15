import { useEffect, useId, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import { cx } from "./ui";

/**
 * Accessible tooltip for an icon button. Spread `triggerProps` on the button and render
 * `tooltip` inside a `relative` wrapper. The text is always linked via aria-describedby,
 * so screen readers announce it; visually it shows on mouse hover (after a short delay)
 * or keyboard focus, never after a touch tap, and Escape dismisses it.
 */
export function useTooltip(text: string) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const delay = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = (ms: number) => {
    clearTimeout(delay.current);
    delay.current = setTimeout(() => setOpen(true), ms);
  };
  const hide = () => {
    clearTimeout(delay.current);
    setOpen(false);
  };

  useEffect(() => () => clearTimeout(delay.current), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return {
    triggerProps: {
      "aria-describedby": id,
      onPointerEnter: (e: PointerEvent) => e.pointerType === "mouse" && show(400),
      onPointerLeave: hide,
      onPointerDown: hide,
      onFocus: (e: FocusEvent<HTMLElement>) => e.currentTarget.matches(":focus-visible") && show(0),
      onBlur: hide,
    },
    tooltip: (
      <span
        id={id}
        role="tooltip"
        className={cx(
          "pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap",
          "rounded-lg bg-fg px-2.5 py-1.5 text-xs font-medium text-bg shadow-lg transition-opacity duration-150",
          open ? "opacity-100" : "opacity-0",
        )}
      >
        {text}
      </span>
    ),
  };
}
