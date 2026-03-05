"use client";

import { useState, useEffect } from "react";
import { Minus, Square, Copy, X } from "lucide-react";

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
  const isElectron =
    typeof window !== "undefined" && window.electronWindow;

  useEffect(() => {
    if (isElectron) {
      // Check initial maximized state
      window.electronWindow?.isMaximized().then(setIsMaximized);

      // Listen for maximize/unmaximize events from the main process
      const cleanup = window.electronWindow?.onMaximizeChange(
        (maximized) => {
          setIsMaximized(maximized);
        },
      );
      return () => cleanup?.();
    }
  }, [isElectron]);

  const handleMinimize = () => {
    if (isElectron) {
      window.electronWindow?.minimize();
    }
  };

  const handleMaximize = () => {
    if (isElectron) {
      window.electronWindow?.maximize();
    }
  };

  const handleClose = () => {
    if (isElectron) {
      window.electronWindow?.close();
    }
  };

  // Don't render if not in Electron environment
  if (!isElectron) {
    return null;
  }

  return (
    <div className="titlebar">
      <div className="titlebar-drag-region">
        <div className="titlebar-title">
          <span className="text-sm font-semibold text-gray-200">
            DataGuard
          </span>
        </div>
      </div>
      <div className="titlebar-controls">
        <button
          onClick={handleMinimize}
          className="titlebar-button hover:bg-white/10"
          aria-label="Minimize"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={handleMaximize}
          className="titlebar-button hover:bg-white/10"
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? <Copy size={14} /> : <Square size={14} />}
        </button>
        <button
          onClick={handleClose}
          className="titlebar-button titlebar-close hover:bg-red-600"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
