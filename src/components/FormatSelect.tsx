// SPDX-License-Identifier: MIT OR Apache-2.0
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, FileCode2, FileText, type LucideIcon } from "lucide-react";
import type { ExportOptions } from "../types";
const formats = [
  { value: "markdown", label: "Markdown (.md)", Icon: FileText },
  { value: "html", label: "HTML (.html)", Icon: FileCode2 },
] as const;
export function FormatSelect({
  value,
  disabled,
  onChange,
}: {
  value: ExportOptions["format"];
  disabled?: boolean;
  onChange: (value: ExportOptions["format"]) => void;
}) {
  return (
    <Dropdown
      label="File format"
      choices={formats}
      value={value}
      disabled={disabled}
      onChange={onChange}
    />
  );
}

export function Dropdown<Value extends string | number>({
  label,
  choices,
  value,
  disabled,
  onChange,
}: {
  label: string;
  choices: readonly { value: Value; label: string; Icon?: LucideIcon }[];
  value: Value;
  disabled?: boolean;
  onChange: (value: Value) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const selectedIndex = Math.max(0, choices.findIndex((choice) => choice.value === value));
  const selected = choices[selectedIndex];
  const activeIndex = Math.min(active, choices.length - 1);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (root.current && !event.composedPath().includes(root.current))
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function choose(index: number) {
    onChange(choices[index].value);
    setOpen(false);
    root.current?.querySelector("button")?.focus();
  }
  return (
    <div className="format-select" ref={root}>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-activedescendant={open ? `${id}-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => {
          setActive(selectedIndex);
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            setActive(
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? choices.length - 1
                  : !open
                    ? selectedIndex
                    : (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length,
            );
            setOpen(true);
          } else if (open && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            choose(activeIndex);
          } else if (open && event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          } else if (event.key === "Tab") setOpen(false);
        }}
      >
        {selected.Icon && <selected.Icon size={18} />}
        <span>{selected.label}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div
          id={id}
          role="listbox"
          aria-label={label}
          className="format-options"
        >
          {choices.map(({ value: choice, label, Icon }, index) => (
            <button
              key={choice}
              id={`${id}-${index}`}
              type="button"
              role="option"
              aria-selected={choice === value}
              tabIndex={-1}
              className={activeIndex === index ? "active" : ""}
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              {Icon && <Icon size={18} />}
              <span>{label}</span>
              {choice === value && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function ExportProgress({ label }: { label: string }) {
  return (
    <div className="export-progress" role="status" aria-live="polite">
      <span>{label}</span>
      <div
        role="progressbar"
        aria-label={label}
        className="export-progress-track"
      >
        <i />
      </div>
    </div>
  );
}
