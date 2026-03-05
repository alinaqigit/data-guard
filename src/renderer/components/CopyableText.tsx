"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

interface CopyableTextProps {
  /** The text value to copy to clipboard */
  text: string;
  /** Optional custom display content (defaults to the text prop) */
  children?: React.ReactNode;
  /** Additional className for the wrapper */
  className?: string;
  /** Size of the copy icon (default: 12) */
  iconSize?: number;
  /** If true, renders inline (span) instead of block (div) */
  inline?: boolean;
}

export default function CopyableText({
  text,
  children,
  className = "",
  iconSize = 12,
  inline = false,
}: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
    [text],
  );

  const Tag = inline ? "span" : "div";

  return (
    <Tag
      className={`group/copy inline-flex items-center gap-1.5 select-text ${className}`}
    >
      <span className="select-text">{children ?? text}</span>
      <button
        onClick={handleCopy}
        title={copied ? "Copied!" : "Copy to clipboard"}
        className="opacity-0 group-hover/copy:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10 text-neutral-500 hover:text-white shrink-0 cursor-pointer select-none"
      >
        {copied ? (
          <Check size={iconSize} className="text-emerald-400" />
        ) : (
          <Copy size={iconSize} />
        )}
      </button>
    </Tag>
  );
}
