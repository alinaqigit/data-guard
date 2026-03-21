import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
} from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "warning";
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  onClose,
  duration = 4000,
}) => {
  const [visible, setVisible] = useState(false);
  const isElectron =
    typeof window !== "undefined" && !!window.electronWindow;
  const topOffset = isElectron ? 56 : 20;

  useEffect(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true)),
    );
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(t);
  }, []);

  const config = {
    success: {
      color: "var(--success-alt)",
      border: "var(--success-a25)",
      Icon: CheckCircle2,
      label: "Success",
    },
    error: {
      color: "var(--danger)",
      border: "var(--danger-a25)",
      Icon: XCircle,
      label: "Error",
    },
    warning: {
      color: "var(--warning)",
      border: "var(--warning-a25)",
      Icon: AlertTriangle,
      label: "Alert",
    },
  }[type];

  return (
    <div
      style={{
        position: "fixed",
        top: `${topOffset}px`,
        right: "20px",
        zIndex: 10000,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-10px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          background: "var(--background-card)",
          border: `1px solid ${config.border}`,
          borderLeft: `3px solid ${config.color}`,
          borderRadius: "12px",
          padding: "14px 16px",
          minWidth: "280px",
          maxWidth: "360px",
          boxShadow: "0 8px 32px var(--shadow-color)",
        }}
      >
        <config.Icon
          size={18}
          style={{
            color: config.color,
            flexShrink: 0,
            marginTop: "1px",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "2px",
            }}
          >
            {config.label}
          </p>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 400,
              color: "var(--text-tertiary)",
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            flexShrink: 0,
            background: "transparent",
            border: "none",
            color: "var(--text-disabled)",
            cursor: "pointer",
            padding: "2px",
            borderRadius: "4px",
            transition: "color 0.15s",
            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-disabled)")
          }
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
