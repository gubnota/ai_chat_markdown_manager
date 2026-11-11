import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { ChevronRight, X, type LucideIcon } from "lucide-react";
export function IconButton({
  label,
  children,
  onClick,
  disabled = false,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="icon-button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function ActionRow({
  icon: Icon,
  title,
  description,
  onClick,
  shortcut,
  disabled = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  shortcut?: string;
  disabled?: boolean;
}) {
  return (
    <button className="action-row" onClick={onClick} disabled={disabled}>
      <span className="row-icon">
        <Icon size={18} />
      </span>
      <span className="row-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {shortcut ? <kbd>{shortcut}</kbd> : <ChevronRight size={14} />}
    </button>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
  description,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className="toggle-row">
      <span>
        {label}
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        disabled={disabled}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous =
      ref.current?.getRootNode() instanceof ShadowRoot
        ? (ref.current.getRootNode() as ShadowRoot).activeElement
        : null;
    const first = ref.current?.querySelector<HTMLElement>("button,input");
    first?.focus();
    return () => {
      (previous as HTMLElement)?.focus?.();
    };
  }, []);
  return (
    <div
      className="dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="dialog"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
          if (e.key === "Tab") {
            const elements = [
              ...e.currentTarget.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]',
              ),
            ];
            const root = e.currentTarget.getRootNode() as ShadowRoot;
            const index = elements.indexOf(root.activeElement as HTMLElement);
            if (e.shiftKey && index <= 0) {
              e.preventDefault();
              elements.at(-1)?.focus();
            } else if (!e.shiftKey && index === elements.length - 1) {
              e.preventDefault();
              elements[0]?.focus();
            }
          }
        }}
      >
        <header>
          <h2>{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </header>
        {children}
      </div>
    </div>
  );
}
