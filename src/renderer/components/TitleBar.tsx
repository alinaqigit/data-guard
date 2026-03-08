"use client";

import { useState, useEffect } from "react";
import { Minus, Square, Copy, X } from "lucide-react";
import Image from "next/image";
import { useSecurity } from "@/context/SecurityContext";

// Extend window interface to include our Electron APIs
declare global {
  interface Window {
    electronWindow?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      onMaximizeChange: (
        callback: (maximized: boolean) => void,
      ) => () => void;
    };
  }
}

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const { resolvedTheme } = useSecurity();
  const isElectron =
    typeof window !== "undefined" && window.electronWindow;

  useEffect(() => {
    if (isElectron) {
      window.electronWindow?.isMaximized().then(setIsMaximized);
      const cleanup = window.electronWindow?.onMaximizeChange(
        (maximized) => {
          setIsMaximized(maximized);
        },
      );
      return () => cleanup?.();
    }
  }, [isElectron]);

  const handleMinimize = () => {
    if (isElectron) window.electronWindow?.minimize();
  };

  const handleMaximize = () => {
    if (isElectron) window.electronWindow?.maximize();
  };

  const handleClose = () => {
    if (isElectron) window.electronWindow?.close();
  };

  // Don't render if not in Electron environment
  if (!isElectron) {
    return null;
  }

  const logoSrc = resolvedTheme === "light" ? "/images/logo-dark.png" : "/images/logo.png";

  return (
    <div className="titlebar">
      <div className="titlebar-brand">
        <div style={{ width: 20, height: 20, position: "relative", flexShrink: 0 }}>
          <Image src={logoSrc} alt="DataGuard" fill className="object-contain" />
        </div>
        <span className="titlebar-title">DataGuard</span>
      </div>
      <div className="titlebar-controls">
        <button
          onClick={handleMinimize}
          className="titlebar-button"
          aria-label="Minimize"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={handleMaximize}
          className="titlebar-button"
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? <Copy size={14} /> : <Square size={14} />}
        </button>
        <button
          onClick={handleClose}
          className="titlebar-button titlebar-close"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
