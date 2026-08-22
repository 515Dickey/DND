"use client";

import { useEffect, useState } from "react";
import type { Derived } from "@/lib/rules";
import { signed } from "@/lib/rules";

/* --- Layout -------------------------------------------------------------- */

export function Panel({
  title,
  children,
  className = "",
  action,
  mark,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  /** A holy symbol to sit faintly behind this panel's contents. */
  mark?: React.ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className={`panel-body ${mark ? "mark-host" : ""}`}>
        {mark}
        {title && (
          <h2 className="panel-title">
            <span>{title}</span>
            {action && <span className="shrink-0 normal-case">{action}</span>}
          </h2>
        )}
        {children}
      </div>
    </section>
  );
}

/* --- Text inputs --------------------------------------------------------- */

export function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-1 block">{label}</span>
      <input
        className="ink-field"
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  className = "",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label mb-1 block">{label}</span>}
      <textarea
        className="ink-field"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label mb-1 block">{label}</span>}
      <select
        className="ink-field"
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const match = options.find((o) => String(o.value) === raw);
          if (match) onChange(match.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * A number input that tolerates being temporarily empty or mid-typed (e.g. "-")
 * without snapping the value back to 0 under the user's fingers.
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  allowDecimal = false,
  className = "",
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  allowDecimal?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);

  const parse = (raw: string) =>
    allowDecimal ? parseFloat(raw) : parseInt(raw, 10);

  // Push the value up on every keystroke so a button tapped straight after
  // typing acts on what's on screen. Values outside the allowed range wait for
  // blur, so typing "50" into a field capped at 30 isn't clamped mid-word.
  const handleChange = (raw: string) => {
    setDraft(raw);
    if (raw.trim() === "" || raw === "-") return;
    const parsed = parse(raw);
    if (Number.isNaN(parsed)) return;
    if (min !== undefined && parsed < min) return;
    if (max !== undefined && parsed > max) return;
    onChange(parsed);
  };

  const commit = (raw: string) => {
    setDraft(null);
    if (raw.trim() === "" || raw === "-") {
      onChange(min !== undefined && min > 0 ? min : 0);
      return;
    }
    const parsed = parse(raw);
    if (Number.isNaN(parsed)) return;
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange(next);
  };

  return (
    <input
      className={`ink-field num-field ${className}`}
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      aria-label={ariaLabel}
      value={shown}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

export function NumField({
  label,
  value,
  onChange,
  min,
  max,
  allowDecimal,
  className = "",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  allowDecimal?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-1 block">{label}</span>
      <NumberInput
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        allowDecimal={allowDecimal}
        ariaLabel={label}
      />
    </label>
  );
}

/** Big − / + control, sized for thumbs. */
export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}) {
  const bump = (delta: number) => {
    let next = value + delta;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange(next);
  };
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="btn btn-icon"
        onClick={() => bump(-step)}
        aria-label={`Decrease ${label ?? "value"}`}
      >
        −
      </button>
      <div className="min-w-12 flex-1">
        <NumberInput value={value} onChange={onChange} min={min} max={max} ariaLabel={label} />
      </div>
      <button
        type="button"
        className="btn btn-icon"
        onClick={() => bump(step)}
        aria-label={`Increase ${label ?? "value"}`}
      >
        +
      </button>
    </div>
  );
}

/* --- Derived values ------------------------------------------------------ */

/**
 * Shows a calculated number alongside the math behind it, and lets the player
 * pin it to a fixed value when some feat or item the sheet doesn't know about
 * changes the result.
 */
export function DerivedStat({
  label,
  derived,
  onOverride,
  asModifier = false,
  size = "md",
  suffix,
}: {
  label: string;
  derived: Derived;
  onOverride: (v: number | null) => void;
  asModifier?: boolean;
  size?: "sm" | "md" | "lg";
  suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  // Seeded when editing starts rather than synced by an effect, so the field
  // always opens showing the number currently on screen.
  const [draft, setDraft] = useState(derived.value);

  const sizes = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-4xl",
  } as const;

  const display = asModifier ? signed(derived.value) : String(derived.value);

  return (
    <div className="stat-box">
      <div className="label">{label}</div>
      {editing ? (
        <div className="mt-1 space-y-1.5">
          <NumberInput value={draft} onChange={setDraft} ariaLabel={`${label} override`} />
          <div className="flex gap-1">
            <button
              type="button"
              className="btn btn-sm flex-1"
              onClick={() => {
                onOverride(draft);
                setEditing(false);
              }}
            >
              Pin
            </button>
            <button
              type="button"
              className="btn btn-sm flex-1"
              onClick={() => {
                onOverride(null);
                setEditing(false);
              }}
            >
              Auto
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="block w-full"
          onClick={() => {
            setDraft(derived.value);
            setEditing(true);
          }}
          title={derived.formula}
        >
          <span
            className={`stat-value ${sizes[size]} ${
              derived.overridden ? "overridden-mark" : ""
            }`}
          >
            {display}
            {suffix && <span className="ml-0.5 text-sm font-normal">{suffix}</span>}
          </span>
        </button>
      )}
      {!editing && (
        <div className="formula mt-1 px-0.5">
          {derived.overridden ? "pinned · tap to change" : derived.formula}
        </div>
      )}
    </div>
  );
}

/* --- Feedback ------------------------------------------------------------ */

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-6 text-center text-sm italic text-ink-faint">{children}</p>
  );
}

/** Two-tap delete, so a stray thumb never wipes a row. */
export function ConfirmButton({
  onConfirm,
  children = "Delete",
  className = "btn btn-sm btn-danger",
  confirmLabel = "Sure?",
}: {
  onConfirm: () => void;
  children?: React.ReactNode;
  className?: string;
  confirmLabel?: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (armed) {
          onConfirm();
          setArmed(false);
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 py-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors"
        style={{
          borderColor: "var(--rule-strong)",
          background: checked ? "var(--accent)" : "rgba(120,100,70,0.18)",
        }}
      >
        <span
          className="block h-4.5 w-4.5 rounded-full bg-paper-hi shadow transition-transform"
          style={{
            width: 18,
            height: 18,
            transform: checked ? "translateX(22px)" : "translateX(3px)",
            background: "var(--paper-hi)",
          }}
        />
      </button>
      <span className="min-w-0">
        <span className="block text-sm leading-tight">{label}</span>
        {hint && <span className="formula block">{hint}</span>}
      </span>
    </label>
  );
}

/* --- Modal --------------------------------------------------------------- */

/**
 * A centered panel over the sheet, for detail that would otherwise clutter it.
 * Closes on Escape, on a backdrop tap, and via the X. Body scroll is locked
 * while it's open so the page behind doesn't drift on a tablet.
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const headingId = `modal-${title.replace(/\W+/g, "-").toLowerCase()}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center"
      style={{ background: "rgba(28, 18, 6, 0.72)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="panel modal-card max-h-[88dvh] w-full max-w-xl overflow-hidden"
        // Clicks inside must not reach the backdrop's close handler.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-body flex max-h-[88dvh] flex-col">
          <div className="mb-2 flex items-start gap-2">
            <h2 id={headingId} className="panel-title mb-0 flex-1">
              {title}
            </h2>
            <button
              type="button"
              className="btn btn-icon shrink-0"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">{children}</div>
          {footer && <div className="mt-3 flex flex-wrap gap-2">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/**
 * A holy symbol behind a block of the sheet.
 *
 * Placed inside whatever it belongs to -- the Hit Points block, the spell
 * slots -- so it tracks that content instead of floating at a fixed offset.
 * The host needs the `mark-host` class; `Panel` adds it for you when given a
 * `mark`. `x` and `y` nudge it off centre for hosts whose empty space isn't in
 * the middle.
 */
export function DeityMark({
  name,
  size = "16rem",
  x = "50%",
  y = "50%",
}: {
  name: string;
  size?: string;
  x?: string;
  y?: string;
}) {
  // Clamped so the mark can never cross its host's edge. The offsets are picked
  // against a tablet, where these panels are wide; the same percentage on a
  // phone would hang the mark out over the page.
  const half = `calc(${size} / 2)`;
  const inside = (v: string) => `clamp(${half}, ${v}, calc(100% - ${half}))`;
  return (
    <span
      className={`deity deity-watermark deity-${name}`}
      style={{ width: size, left: inside(x), top: inside(y) }}
      aria-hidden="true"
    />
  );
}
