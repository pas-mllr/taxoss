"use client";

import { useMemo, useRef, useState } from "react";
import { IconSearch } from "@/components/icons";

export type AdminPickerOption = {
  value: string;
  label: string;
  hint?: string;
};

const PICKER_MAX = 40;

export function AdminSearchPicker({
  id,
  placeholder,
  options,
  value,
  onChange,
}: {
  id: string;
  placeholder: string;
  options: AdminPickerOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value) ?? null;
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) =>
      `${option.label} ${option.hint ?? ""}`.toLowerCase().includes(needle),
    );
  }, [options, query]);
  const shown = matches.slice(0, PICKER_MAX);

  function pick(next: string) {
    onChange(next);
    setQuery("");
    setOpen(false);
  }

  if (selected) {
    return (
      <div className="field picker-chosen">
        <span className="pc-label" title={selected.label}>
          {selected.label}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            onChange("");
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="picker">
      <div className="field">
        <IconSearch />
        <input
          ref={inputRef}
          id={id}
          name={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, shown.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (shown[active]) pick(shown[active].value);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>
      {open && (
        <div className="picker-list" id={`${id}-list`} role="listbox">
          {shown.length === 0 ? (
            <div className="picker-note">No match.</div>
          ) : (
            shown.map((option, index) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={index === active}
                className={`picker-item${index === active ? " is-active" : ""}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(option.value);
                }}
                onMouseEnter={() => setActive(index)}
              >
                <span>{option.label}</span>
                {option.hint && <span className="pi-hint">{option.hint}</span>}
              </button>
            ))
          )}
          {matches.length > shown.length && (
            <div className="picker-note">
              {matches.length - shown.length} more — keep typing to narrow down.
            </div>
          )}
        </div>
      )}
    </div>
  );
}