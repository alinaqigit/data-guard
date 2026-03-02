"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Shield } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";

interface Policy {
    id: string; name: string; description: string;
    type: string; pattern: string; status: "Active" | "Disabled";
}

interface PolicyModalProps {
    isOpen: boolean;
    onClose: () => void;
    policy: Policy | null;
    onSave: (policy: Policy) => void;
    isNew?: boolean;
}

const TYPE_OPTIONS = [
    { value: "KEYWORD", label: "Keyword",      description: "Match exact words or phrases" },
    { value: "REGEX",   label: "RegEx Pattern", description: "Match using a regular expression" },
];

const STATUS_OPTIONS = [
    { value: "Active",   label: "Active" },
    { value: "Disabled", label: "Disabled" },
];

const REGEX_PATTERNS = [
    { value: "[0-9]{5}-[0-9]{7}-[0-9]",                                                                                                          label: "CNIC",                  description: "Pakistani CNIC — e.g. 12345-1234567-1" },
    { value: "(\\+92|0092|0)[0-9]{10}",                                                                                                           label: "Phone (Pakistani)",      description: "e.g. +923001234567" },
    { value: "PK[0-9]{2}[A-Z]{4}[0-9]{16}",                                                                                                      label: "IBAN (Pakistani)",       description: "e.g. PK36SCBL0000001123456702" },
    { value: "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b",                                   label: "Credit Card",            description: "Visa, Mastercard, Amex, Discover" },
    { value: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",                                                                                  label: "Email Address",          description: "Standard email format" },
    { value: "(?:api[_\\-]?key|apikey)[\\s]*[=:][\\s]*['\"]?([a-zA-Z0-9_\\-]{20,})['\"]?",                                                       label: "API Key",                description: "Matches api_key=..., apikey: ..." },
    { value: "(?:secret|secret[_\\-]?key)[\\s]*[=:][\\s]*['\"]?([a-zA-Z0-9_\\-]{16,})['\"]?",                                                    label: "Secret Key",             description: "Matches secret=..., secret_key: ..." },
];

const DEFAULT: Policy = { id: "", name: "", description: "", type: "KEYWORD", pattern: "", status: "Active" };

const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 600, color: '#535865',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    display: 'block', marginBottom: '8px',
};

const inputStyle: React.CSSProperties = {
    width: '100%', background: '#0D1117',
    border: '1px solid #30363D', borderRadius: '10px',
    padding: '9px 12px', color: '#FFFFFF',
    fontSize: '13px', outline: 'none',
    transition: 'border-color 0.15s ease',
    boxSizing: 'border-box',
};

const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose, policy, onSave, isNew = false }) => {
    const [formData, setFormData] = useState<Policy>(DEFAULT);
    const [visible, setVisible]   = useState(false);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(policy ? { ...policy, type: policy.type?.toUpperCase() || 'KEYWORD' } : { ...DEFAULT });
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

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 50,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                backgroundColor: `rgba(0,0,0,${animating ? 0.7 : 0})`,
                backdropFilter: `blur(${animating ? 6 : 0}px)`,
                transition: 'background-color 250ms ease, backdrop-filter 250ms ease',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#12161B',
                    border: '1px solid #30363D',
                    borderRadius: '16px',
                    width: '100%', maxWidth: '480px',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                    opacity: animating ? 1 : 0,
                    transform: animating ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(8px)',
                    transition: 'opacity 250ms cubic-bezier(0.16,1,0.3,1), transform 250ms cubic-bezier(0.16,1,0.3,1)',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 20px', borderBottom: '1px solid #1A1F28',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: 'rgba(82,114,197,0.12)', border: '1px solid rgba(82,114,197,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Shield size={16} style={{ color: '#5272C5' }} />
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>
                            {isNew ? 'New Policy' : 'Edit Policy'}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: '28px', height: '28px', borderRadius: '8px',
                            background: 'transparent', border: '1px solid transparent',
                            color: '#535865', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#161B22'; e.currentTarget.style.borderColor = '#30363D'; e.currentTarget.style.color = '#FFFFFF'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#535865'; }}
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Body */}
                <form
                    onSubmit={e => { e.preventDefault(); onSave(formData); }}
                    style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                    {/* Name */}
                    <div>
                        <label style={labelStyle}>Policy Name</label>
                        <input
                            type="text" required value={formData.name}
                            placeholder="e.g. CNIC Detection Policy"
                            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                            style={inputStyle}
                            onFocus={e => (e.currentTarget.style.borderColor = '#445C9A')}
                            onBlur={e => (e.currentTarget.style.borderColor = '#30363D')}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label style={labelStyle}>Description</label>
                        <textarea
                            rows={2} value={formData.description}
                            placeholder="Describe what this policy detects..."
                            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                            style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
                            onFocus={e => (e.currentTarget.style.borderColor = '#445C9A')}
                            onBlur={e => (e.currentTarget.style.borderColor = '#30363D')}
                        />
                    </div>

                    {/* Type + Status */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={labelStyle}>Type</label>
                            <CustomSelect
                                value={formData.type}
                                onChange={val => setFormData(p => ({ ...p, type: val, pattern: "" }))}
                                options={TYPE_OPTIONS}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Status</label>
                            <CustomSelect
                                value={formData.status}
                                onChange={val => setFormData(p => ({ ...p, status: val as "Active" | "Disabled" }))}
                                options={STATUS_OPTIONS}
                            />
                        </div>
                    </div>

                    {/* Pattern */}
                    <div>
                        <label style={labelStyle}>{isRegex ? 'RegEx Pattern' : 'Keyword or Phrase'}</label>
                        {isRegex ? (
                            <>
                                <CustomSelect
                                    value={formData.pattern}
                                    onChange={val => setFormData(p => ({ ...p, pattern: val }))}
                                    options={REGEX_PATTERNS}
                                    placeholder="Select a predefined pattern..."
                                />
                                {formData.pattern && (
                                    <div style={{
                                        marginTop: '8px', padding: '10px 12px',
                                        background: '#0D1117', border: '1px solid #30363D',
                                        borderRadius: '8px',
                                    }}>
                                        <p style={{ fontSize: '11px', color: '#535865', fontWeight: 500, marginBottom: '4px' }}>
                                            Pattern preview
                                        </p>
                                        <code style={{ fontSize: '11px', color: '#5272C5', wordBreak: 'break-all' }}>
                                            {formData.pattern}
                                        </code>
                                    </div>
                                )}
                            </>
                        ) : (
                            <input
                                type="text" required value={formData.pattern}
                                placeholder="e.g. confidential, salary, passport"
                                onChange={e => setFormData(p => ({ ...p, pattern: e.target.value }))}
                                style={inputStyle}
                                onFocus={e => (e.currentTarget.style.borderColor = '#445C9A')}
                                onBlur={e => (e.currentTarget.style.borderColor = '#30363D')}
                            />
                        )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
                        <button
                            type="button" onClick={onClose}
                            style={{
                                padding: '9px 18px', borderRadius: '10px',
                                background: '#161B22', border: '1px solid #30363D',
                                color: '#989898', fontSize: '13px', fontWeight: 500,
                                cursor: 'pointer', transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#535865'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#989898'; e.currentTarget.style.borderColor = '#30363D'; }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isRegex && !formData.pattern}
                            style={{
                                padding: '9px 18px', borderRadius: '10px',
                                background: isRegex && !formData.pattern ? '#3B5189' : '#5272C5',
                                border: 'none', color: '#FFFFFF',
                                fontSize: '13px', fontWeight: 600,
                                cursor: isRegex && !formData.pattern ? 'not-allowed' : 'pointer',
                                opacity: isRegex && !formData.pattern ? 0.6 : 1,
                                display: 'flex', alignItems: 'center', gap: '8px',
                                transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={e => { if (!(isRegex && !formData.pattern)) e.currentTarget.style.background = '#445C9A'; }}
                            onMouseLeave={e => { if (!(isRegex && !formData.pattern)) e.currentTarget.style.background = '#5272C5'; }}
                        >
                            <Save size={14} />
                            {isNew ? 'Create Policy' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PolicyModal;