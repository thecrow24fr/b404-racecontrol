"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ContactSelectProps {
  id: string;
  name: string;
  value: string;
  placeholder: string;
  options: string[];
  required: boolean;
  error: string | null;
  onChange: (name: string, value: string) => void;
}

/**
 * Liste déroulante personnalisée.
 * Remplace le <select> natif pour un meilleur contrôle du style,
 * notamment le survol des options.
 */
export function ContactSelect({
  id,
  name,
  value,
  placeholder,
  options,
  required,
  error,
  onChange,
}: ContactSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const baseBorder =
    "w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition";

  const errorBorder = error
    ? "border-red-400/50 focus:border-red-400/60 focus:ring-red-400/30"
    : "border-white/10";

  // Fermer au clic en dehors
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () =>
      document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Scroll de l'option focusée dans la liste
  useEffect(() => {
    if (isOpen && listRef.current && focusedIndex >= 0) {
      const item = listRef.current.children[focusedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          setIsOpen(true);
          setFocusedIndex(0);
        }
        return;
      }

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : options.length - 1
          );
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < options.length) {
            onChange(name, options[focusedIndex]);
            setIsOpen(false);
            setFocusedIndex(-1);
          }
          break;
      }
    },
    [isOpen, focusedIndex, options, onChange, name]
  );

  const selectedLabel = value || placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        name={name}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setFocusedIndex(options.indexOf(value));
        }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `error-${name}` : undefined}
        className={`${baseBorder} ${errorBorder} flex w-full items-center justify-between text-left ${
          value ? "text-white" : "text-gray-500"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={placeholder}
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#0d1b2e] shadow-xl shadow-black/30"
          style={{ transform: "translateY(4px)" }}
        >
          {options.map((opt, index) => (
            <li
              key={opt}
              role="option"
              aria-selected={value === opt}
              onMouseDown={(e) => {
                // onMouseDown plutôt que onClick pour éviter le blur du bouton
                e.preventDefault();
                onChange(name, opt);
                setIsOpen(false);
                setFocusedIndex(-1);
              }}
              onMouseEnter={() => setFocusedIndex(index)}
              className={`cursor-pointer px-4 py-2.5 text-sm transition ${
                value === opt
                  ? "bg-orange-500/20 text-orange-200"
                  : focusedIndex === index
                    ? "bg-white/10 text-white"
                    : "text-gray-300 hover:bg-white/5"
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
