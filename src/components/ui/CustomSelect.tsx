import { useEffect, useRef, useState } from "react";

export type CustomSelectOption = {
  value: string;
  label: string;
  description?: string;
  flag?: string;
};

type CustomSelectProps = {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
};

function CountryFlag({ code, label }: { code: string; label: string }) {
  return (
    <img
      className="country-flag"
      src={`https://flagcdn.com/24x18/${code}.png`}
      srcSet={`https://flagcdn.com/48x36/${code}.png 2x`}
      width="24"
      height="18"
      alt={`${label} flag`}
      loading="lazy"
    />
  );
}

export function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={`custom-select ${isOpen ? "is-open" : ""}`} ref={rootRef}>
      <button
        ref={triggerRef}
        className="custom-select-trigger"
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <span className="custom-select-value">
          {selected?.flag && <CountryFlag code={selected.flag} label={selected.label} />}
          <span className="custom-select-value-label">{selected?.label ?? "Choose"}</span>
        </span>
        <span className="custom-select-chevron" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="custom-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              className={`custom-select-option ${option.value === value ? "is-selected" : ""}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              onClick={() => choose(option.value)}
            >
              <span className="custom-select-option-content">
                {option.flag && <CountryFlag code={option.flag} label={option.label} />}
                <span>
                  <span className="custom-select-option-label">{option.label}</span>
                  {option.description && (
                    <span className="custom-select-option-description">{option.description}</span>
                  )}
                </span>
              </span>
              <span
                className={`custom-select-indicator ${option.value === value ? "is-selected" : ""}`}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
