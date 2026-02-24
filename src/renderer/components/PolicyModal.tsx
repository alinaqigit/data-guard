"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Shield } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";

interface Policy {
  id: string;
  name: string;
  description: string;
  type: string;
  pattern: string;
  status: "Active" | "Disabled";
}

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: Policy | null;
  onSave: (policy: Policy) => void;
  isNew?: boolean;
}

const TYPE_OPTIONS = [
  { value: "KEYWORD", label: "Keyword", description: "Match exact words or phrases" },
  { value: "REGEX", label: "RegEx Pattern", description: "Match using a regular expression" },
];

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Disabled", label: "Disabled" },
];

const REGEX_PATTERNS = [
  { value: "^[0-9]{5}-[0-9]{7}-[0-9]{1}$", label: "CNIC", description: "Pakistani CNIC (e.g. 12345-1234567-1)" },
  { value: "^(\\+92|0)[0-9]{10}$", label: "Phone Number (Pakistani)", description: "e.g. +923001234567 or 03001234567" },
  { value: "^PK[0-9]{2}[A-Z]{4}[0-9]{16}$", label: "IBAN (Pakistani)", description: "e.g. PK36SCBL0000001123456702" },
  { value: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", label: "Email Address", description: "Standard email format" },
  { value: "^[0-9]{16}$", label: "Credit Card Number", description: "16-digit card number" },
  { value: "^[0-9]{3}-[0-9]{2}-[0-9]{4}$", label: "SSN (US)", description: "Social Security Number" },
  { value: "\\b(password|passwd|secret|api_key|token)\\b", label: "Sensitive Keywords", description: "Common sensitive data keywords" },
];

const DEFAULT_NEW_POLICY: Policy = {
  id: "",
  name: "",
  description: "",
  type: "KEYWORD",
  pattern: "",
  status: "Active",
};

const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  onClose,
  policy,
  onSave,
  isNew = false,
}) => {
  const [formData, setFormData] = useState<Policy>(DEFAULT_NEW_POLICY);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(policy ? { ...policy, type: policy.type?.toUpperCase() || 'KEYWORD' } : { ...DEFAULT_NEW_POLICY });
      setVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    } else {
      setAnimating(false);
      const t = setTimeout(() => setVisible(false), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen, policy]);

  if (!visible) return null;

  const isRegex = formData.type === "REGEX";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) onSave(formData);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: `rgba(0,0,0,${animating ? 0.6 : 0})`,
        backdropFilter: `blur(${animating ? 6 : 0}px)`,
        transition: "background-color 250ms ease, backdrop-filter 250ms ease",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #020617 100%)",
          boxShadow: "0 0 50px -12px rgba(0,0,0,0.5)",
          opacity: animating ? 1 : 0,
          transform: animating ? "scale(1)" : "scale(0.92)",
          transition: "opacity 250ms cubic-bezier(0.16,1,0.3,1), transform 250ms cubic-bezier(0.16,1,0.3,1)",
        }}
        className="border border-white/10 rounded-2xl w-full max-w-lg"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <Shield className="text-indigo-500" size={24} />
            {isNew ? "New Policy" : "Edit Policy"}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Policy Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Policy Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="e.g. CNIC Detection Policy"
              className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-neutral-600"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="Describe what this policy detects..."
              className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors resize-none placeholder:text-neutral-600"
            />
          </div>

          {/* Type + Status row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">Type</label>
              <CustomSelect
                value={formData.type}
                onChange={(val) => setFormData((p) => ({ ...p, type: val, pattern: "" }))}
                options={TYPE_OPTIONS}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">Status</label>
              <CustomSelect
                value={formData.status}
                onChange={(val) => setFormData((p) => ({ ...p, status: val as "Active" | "Disabled" }))}
                options={STATUS_OPTIONS}
              />
            </div>
          </div>

          {/* Pattern / Value — label and input change based on type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">
              {isRegex ? "RegEx Pattern" : "Keyword or Phrase"}
            </label>

            {isRegex ? (
              <>
                <CustomSelect
                  value={formData.pattern}
                  onChange={(val) => setFormData((p) => ({ ...p, pattern: val }))}
                  options={REGEX_PATTERNS}
                  placeholder="Select a predefined pattern..."
                />
                {formData.pattern && (
                  <div className="mt-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-xs text-neutral-500 font-medium mb-1">Pattern preview</p>
                    <code className="text-xs text-indigo-300 break-all">{formData.pattern}</code>
                  </div>
                )}
              </>
            ) : (
              <input
                type="text"
                value={formData.pattern}
                onChange={(e) => setFormData((p) => ({ ...p, pattern: e.target.value }))}
                required
                placeholder="e.g. confidential, salary, passport"
                className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-neutral-600"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRegex && !formData.pattern}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <Save size={18} />
              {isNew ? "Create Policy" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PolicyModal;