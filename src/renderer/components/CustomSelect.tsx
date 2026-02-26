"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { createPortal } from "react-dom";

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  // Position the dropdown based on trigger button's position in viewport
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = Math.min(options.length * 56 + 8, 280);

    // Open upward if not enough space below
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: viewportHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  };

  const handleOpen = () => {
    updatePosition();
    setOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const handler = () => updatePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open]);

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{
        ...dropdownStyle,
        background: "linear-gradient(135deg, #0a0f1e 0%, #050505 100%)",
      }}
      className="rounded-xl border border-white/10 shadow-2xl shadow-black/50 overflow-y-auto"
    >
      <div className="py-1 max-h-[280px] overflow-y-auto">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-150
                ${isSelected
                  ? "bg-indigo-600/20 text-white"
                  : "text-neutral-300 hover:bg-white/5 hover:text-white"
                }`}
            >
              <div>
                <p className="text-sm font-bold">{option.label}</p>
                {option.description && (
                  <p className="text-xs text-neutral-500 mt-0.5">{option.description}</p>
                )}
              </div>
              {isSelected && <Check size={15} className="text-indigo-400 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl
          bg-black/40 border text-left font-bold text-sm transition-all duration-200
          ${open
            ? "border-indigo-500 ring-2 ring-indigo-500/20 text-white"
            : "border-white/10 text-white hover:border-white/20 hover:bg-black/60"
          }`}
      >
        <span className={selected ? "text-white" : "text-neutral-500"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-neutral-400 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180 text-indigo-400" : ""}`}
        />
      </button>

      {/* Render dropdown via portal so it escapes any overflow:hidden parent */}
      {typeof window !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}