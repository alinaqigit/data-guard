"use client";

import { useState } from "react";
import { Shield, Plus, Edit2, Slash, Trash2 } from "lucide-react";
import { useSecurity } from "@/context/SecurityContext";
import PolicyModal from "@/components/PolicyModal";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Policy {
  id: string; name: string; description: string;
  type: string; pattern: string; status: "Active" | "Disabled";
}

export default function PolicyManagementPage() {
  const { policies, deletePolicy, togglePolicyStatus, addPolicy, updatePolicy, alerts } = useSecurity();
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [isNewPolicyOpen, setIsNewPolicyOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; policyId: string | null }>({ isOpen: false, policyId: null });

  const totalPolicies = policies.length;
  const activePolicies = policies.filter((p) => p.status === "Active").length;
  const implementationPct = totalPolicies === 0 ? 0 : Math.round((activePolicies / totalPolicies) * 100);
  const todayStr = new Date().toISOString().split("T")[0];
  const violationsToday = alerts.filter((a) => a.time.split(" ")[0] === todayStr && a.status !== "Resolved").length;

  const handleCreatePolicy = async (policy: Policy) => {
    try {
      await addPolicy({ name: policy.name, description: policy.description, pattern: policy.pattern, type: policy.type, status: policy.status });
      setIsNewPolicyOpen(false);
      setToast({ message: "Policy created successfully.", type: "success" });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Failed to create policy", type: "error" });
    }
  };

  const handleSavePolicy = async (updatedPolicy: Policy) => {
    try {
      await updatePolicy(updatedPolicy);
      setEditingPolicy(null);
      setToast({ message: "Policy updated successfully.", type: "success" });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Failed to update policy", type: "error" });
    }
  };

  const handleConfirmDelete = async () => {
    if (confirmState.policyId) {
      try {
        await deletePolicy(confirmState.policyId);
        setToast({ message: "Policy deleted.", type: "success" });
        setConfirmState({ isOpen: false, policyId: null });
      } catch (error) {
        setToast({ message: error instanceof Error ? error.message : "Failed to delete policy", type: "error" });
      }
    }
  };

  const cardStyle = { background: '#12161B', border: '1px solid #30363D', borderRadius: '16px' };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
          Policy Management
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policies list */}
        <div className="lg:col-span-2">
          <div style={cardStyle} className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #30363D' }}>
              <div className="flex items-center gap-3">
                <Shield size={20} style={{ color: '#22C35D' }} />
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>Active Policies</span>
                {totalPolicies > 0 && (
                  <span style={{ fontSize: '13px', fontWeight: 400, color: '#535865' }}>({totalPolicies})</span>
                )}
              </div>
              <button
                onClick={() => setIsNewPolicyOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
                style={{ background: '#5272C5', color: '#FFFFFF', fontSize: '13px', fontWeight: 600 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#445C9A')}
                onMouseLeave={e => (e.currentTarget.style.background = '#5272C5')}
              >
                <Plus size={16} /> New Policy
              </button>
            </div>

            <div>
              {policies.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <Shield size={36} style={{ color: '#30363D', margin: '0 auto 12px' }} />
                  <p style={{ color: '#535865', fontWeight: 500 }}>No policies yet</p>
                  <p style={{ color: '#30363D', fontSize: '13px', marginTop: '4px' }}>Click "New Policy" to create your first policy.</p>
                </div>
              ) : policies.map((policy: any, i: number) => (
                <div key={policy.id}
                    style={{ padding: '16px 20px', borderTop: i > 0 ? '1px solid #1A1F28' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#161B22')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>{policy.name}</h3>
                      <p style={{ fontSize: '13px', fontWeight: 400, color: '#989898', lineHeight: 1.5 }}>{policy.description}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span style={{
                          background: '#161B22', color: '#BABABA', border: '1px solid #30363D',
                          borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                        }}>{policy.type}</span>
                        <code style={{
                          fontSize: '11px', color: '#5272C5', background: 'rgba(82,114,197,0.1)',
                          border: '1px solid rgba(82,114,197,0.2)', borderRadius: '6px',
                          padding: '2px 8px', maxWidth: '200px', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block',
                        }}>{policy.pattern}</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0" style={{
                      background: policy.status === 'Active' ? 'rgba(34,195,93,0.1)' : 'rgba(48,54,61,0.5)',
                      border: `1px solid ${policy.status === 'Active' ? 'rgba(34,195,93,0.25)' : '#30363D'}`,
                      borderRadius: '99px', padding: '4px 12px',
                    }}>
                      <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: policy.status === 'Active' ? '#22C35D' : '#535865',
                      }} />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: policy.status === 'Active' ? '#22C35D' : '#535865' }}>
                        {policy.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <button onClick={() => setEditingPolicy(policy)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                      style={{ fontSize: '12px', fontWeight: 500, color: '#5272C5', background: 'rgba(82,114,197,0.08)', border: '1px solid rgba(82,114,197,0.2)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(82,114,197,0.15)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(82,114,197,0.08)')}
                    ><Edit2 size={13} /> Edit</button>
                    <button onClick={() => togglePolicyStatus(policy.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        fontSize: '12px', fontWeight: 500,
                        color: policy.status === 'Active' ? '#F85149' : '#22C35D',
                        background: policy.status === 'Active' ? 'rgba(248,81,73,0.08)' : 'rgba(34,195,93,0.08)',
                        border: `1px solid ${policy.status === 'Active' ? 'rgba(248,81,73,0.2)' : 'rgba(34,195,93,0.2)'}`,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    ><Slash size={13} /> {policy.status === 'Active' ? 'Disable' : 'Enable'}</button>
                    <button onClick={() => setConfirmState({ isOpen: true, policyId: policy.id })}
                      className="ml-auto p-1.5 rounded-lg transition-all"
                      style={{ color: '#535865' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#F85149'; e.currentTarget.style.background = 'rgba(248,81,73,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#535865'; e.currentTarget.style.background = 'transparent'; }}
                    ><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div style={{ ...cardStyle, padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', marginBottom: '20px' }}>Policy Statistics</h3>

          <div style={{ textAlign: 'center', paddingBottom: '20px', marginBottom: '20px', borderBottom: '1px solid #1A1F28' }}>
            <p style={{ fontSize: '48px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>{implementationPct}%</p>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#535865', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>Policy Implementation</p>
            <p style={{ fontSize: '12px', color: '#30363D', marginTop: '4px' }}>{activePolicies} of {totalPolicies} enforced</p>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#989898' }}>Violations Today</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#F85149' }}>{violationsToday}</span>
              </div>
              <div style={{ height: '6px', background: '#1A1F28', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: '#F85149', borderRadius: '99px',
                  width: `${Math.min(100, (violationsToday / Math.max(10, violationsToday)) * 100)}%`,
                  transition: 'width 0.7s ease',
                }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#989898' }}>Coverage</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#22C35D' }}>{implementationPct}%</span>
              </div>
              <div style={{ height: '6px', background: '#1A1F28', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#22C35D', borderRadius: '99px', width: `${implementationPct}%`, transition: 'width 0.7s ease' }} />
              </div>
              <p style={{ fontSize: '11px', color: '#30363D', marginTop: '4px' }}>Percentage of active policies in enforcement</p>
            </div>
          </div>
        </div>
      </div>

      <PolicyModal isOpen={isNewPolicyOpen} policy={null} isNew onClose={() => setIsNewPolicyOpen(false)} onSave={handleCreatePolicy} />
      <PolicyModal isOpen={!!editingPolicy} policy={editingPolicy} isNew={false} onClose={() => setEditingPolicy(null)} onSave={handleSavePolicy} />
      <ConfirmDialog isOpen={confirmState.isOpen} title="Delete Policy?"
        message="This policy will be permanently deleted and can't be recovered."
        confirmText="Delete Policy" isDestructive onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmState({ isOpen: false, policyId: null })} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}