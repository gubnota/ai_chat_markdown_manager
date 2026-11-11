// SPDX-License-Identifier: MIT OR Apache-2.0
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, FileCode2, FileText } from "lucide-react";
import type { ExportOptions } from "../types";
const choices = [
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
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const selected = choices.find((choice) => choice.value === value)!;
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (root.current && !event.composedPath().includes(root.current))
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
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
        aria-label="File format"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        disabled={disabled}
        onClick={() => {
          setActive(choices.findIndex((choice) => choice.value === value));
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            setActive(
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? 1
                  : !open
                    ? choices.findIndex((choice) => choice.value === value)
                    : (active + 1) % choices.length,
            );
            setOpen(true);
          } else if (open && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            choose(active);
          } else if (open && event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          } else if (event.key === "Tab") setOpen(false);
        }}
      >
        <selected.Icon size={18} />
        <span>{selected.label}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div
          id={id}
          role="listbox"
          aria-label="File format"
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
              className={active === index ? "active" : ""}
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <Icon size={18} />
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
