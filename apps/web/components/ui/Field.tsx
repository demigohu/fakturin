import { useId, type ReactNode } from "react";
import s from "./ui.module.css";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  helper,
  error,
  mono,
  inputMode,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helper?: ReactNode;
  error?: string | null;
  mono?: boolean;
  inputMode?: "numeric" | "text";
  suffix?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      <input
        id={id}
        className={`${s.input} ${mono ? s.inputMono : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={helper ? `${id}-help` : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      {helper && (
        <span id={`${id}-help`} className={s.helper}>
          {helper}
        </span>
      )}
      {suffix}
      {error && (
        <span className={s.fieldError} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className={s.fieldRow}>{children}</div>;
}
