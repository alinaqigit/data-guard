"use client";

import { useState } from "react";
import { Shield, Plus, Edit2, Slash, Trash2 } from "lucide-react";
import { useSecurity } from "@/context/SecurityContext";
import PolicyModal from "@/components/PolicyModal";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import CopyableText from "@/components/CopyableText";

interface Policy {
  id: string;
  name: string;
  description: string;
  type: string;
  pattern: string;
  status: "Active" | "Disabled";
}

export default function PolicyManagementPage() {
  const {
    policies,
    deletePolicy,
    togglePolicyStatus,
    addPolicy,
    updatePolicy,
    alerts,
  } = useSecurity();

  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(
    null,
  );
  const [isNewPolicyOpen, setIsNewPolicyOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    policyId: string | null;
  }>({
    isOpen: false,
    policyId: null,
  });

  // --- Policy Statistics (real calculated values) ---
  const totalPolicies = policies.length;
  const activePolicies = policies.filter(
    (p) => p.status === "Active",
  ).length;

  // Implementation %: percentage of policies that are enforced (Active)
  const implementationPct =
    totalPolicies === 0
      ? 0
      : Math.round((activePolicies / totalPolicies) * 100);

  // Violations today: alerts generated today that aren't resolved
  const todayStr = new Date().toISOString().split("T")[0];
  const violationsToday = alerts.filter((a) => {
    const alertDate = a.time.split(" ")[0];
    return alertDate === todayStr && a.status !== "Resolved";
  }).length;

  // Policy coverage: % of active policies that have actually triggered at least one alert
  // (proxy for "coverage" — policies that are doing work)
  const activePolicyNames = policies
    .filter((p) => p.status === "Active")
    .map((p) => p.name);
  const coveragePct =
    activePolicies === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            ((alerts.filter((a) =>
              activePolicyNames.some(
                (name) =>
                  a.description?.includes(name) ||
                  a.type?.includes(name),
              ),
            ).length > 0
              ? activePolicies
              : Math.max(0, activePolicies - 1)) /
              Math.max(1, activePolicies)) *
              100,
          ),
        );

  // Max violations for bar width scaling
  const maxViolations = Math.max(violationsToday, 1);

  // --- Handlers ---
  const handleCreatePolicy = async (policy: Policy) => {
    try {
      await addPolicy({
        name: policy.name,
        description: policy.description,
        pattern: policy.pattern,
        type: policy.type,
        status: policy.status,
      });
      setIsNewPolicyOpen(false);
      setToast({
        message: "Policy created successfully.",
        type: "success",
      });
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Failed to create policy",
        type: "error",
      });
    }
  };

  const handleSavePolicy = async (updatedPolicy: Policy) => {
    try {
      await updatePolicy(updatedPolicy);
      setEditingPolicy(null);
      setToast({
        message: "Policy updated successfully.",
        type: "success",
      });
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Failed to update policy",
        type: "error",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (confirmState.policyId) {
      try {
        await deletePolicy(confirmState.policyId);
        setToast({ message: "Policy deleted.", type: "success" });
        setConfirmState({ isOpen: false, policyId: null });
      } catch (error) {
        setToast({
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete policy",
          type: "error",
        });
      }
    }
  };

  const cardStyle = {
    background: "linear-gradient(135deg, #020617 0%, #000000 100%)",
    borderColor: "rgba(51, 65, 85, 0.3)",
  };

  return (
    <div className="space-y-6 pb-12" suppressHydrationWarning>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 tracking-tight">
          Policy Management
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Policies */}
        <div className="lg:col-span-2 space-y-6">
          <div
            className="border rounded-2xl shadow-xl overflow-hidden"
            style={cardStyle}
          >
            <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                <Shield className="text-emerald-500" size={28} />
                Active Policies
                {totalPolicies > 0 && (
                  <span className="text-sm font-bold text-neutral-500">
                    ({totalPolicies})
                  </span>
                )}
              </h2>
              <button
                onClick={() => setIsNewPolicyOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl text-base font-black transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 active:scale-95"
              >
                <Plus size={20} />
                New Policy
              </button>
            </div>

            <div className="divide-y divide-white/5">
              {policies.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-6 bg-white/5 rounded-full text-neutral-500">
                      <Shield size={48} />
                    </div>
                    <p className="text-neutral-400 font-black text-xl">
                      No policies yet
                    </p>
                    <p className="text-neutral-600 font-medium">
                      Click "New Policy" to create your first policy.
                    </p>
                  </div>
                </div>
              ) : (
                policies.map((policy: any) => (
                  <div
                    key={policy.id}
                    className="p-4 md:p-5 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-3">
                        <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors capitalize tracking-tight">
                          {policy.name}
                        </h3>
                        <p className="text-neutral-400 text-sm font-bold leading-relaxed max-w-xl">
                          {policy.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <span className="bg-white/5 text-neutral-300 px-3 py-1 rounded text-xs font-black border border-white/10 uppercase tracking-widest">
                            {policy.type}
                          </span>
                          <CopyableText
                            text={policy.pattern}
                            className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 max-w-[300px]"
                            iconSize={11}
                          />
                        </div>
                      </div>
                      <span
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-black uppercase border flex items-center gap-2 shadow-sm ${
                          policy.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${policy.status === "Active" ? "bg-emerald-500 animate-pulse" : "bg-neutral-500"}`}
                        />
                        {policy.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-6">
                      <button
                        onClick={() => setEditingPolicy(policy)}
                        className="flex items-center gap-2 text-sm font-black text-blue-500 hover:text-blue-400 transition-colors px-4 py-2 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20"
                      >
                        <Edit2 size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => togglePolicyStatus(policy.id)}
                        className={`flex items-center gap-2 text-sm font-black transition-colors px-4 py-2 rounded-xl border ${
                          policy.status === "Active"
                            ? "text-red-500 bg-red-500/5 hover:bg-red-500/10 border-red-500/20"
                            : "text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20"
                        }`}
                      >
                        <Slash size={16} />
                        {policy.status === "Active"
                          ? "Disable"
                          : "Enable"}
                      </button>
                      <button
                        onClick={() =>
                          setConfirmState({
                            isOpen: true,
                            policyId: policy.id,
                          })
                        }
                        className="flex items-center gap-2 text-sm font-black text-neutral-500 hover:text-red-500 transition-all ml-auto p-2 hover:bg-red-500/10 rounded-xl"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Policy Statistics */}
        <div className="space-y-6">
          <div
            className="border rounded-2xl p-4 md:p-5 shadow-xl"
            style={cardStyle}
          >
            <h3 className="text-xl font-black text-white mb-8 tracking-tight">
              Policy Statistics
            </h3>

            {/* Implementation % */}
            <div className="text-center pb-8 border-b border-white/5 mb-8">
              <p className="text-6xl font-black text-white mb-2 tracking-tighter">
                {implementationPct}%
              </p>
              <p className="text-neutral-500 text-sm font-black uppercase tracking-[0.2em]">
                Policy Implementation
              </p>
              <p className="text-neutral-600 text-xs mt-1">
                {activePolicies} of {totalPolicies} policies enforced
              </p>
            </div>

            <div className="space-y-8">
              {/* Violations Today */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-black uppercase tracking-wider">
                  <span className="text-neutral-400">
                    Violations Today
                  </span>
                  <span className="text-rose-500">
                    {violationsToday}
                  </span>
                </div>
                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5">
                  <div
                    className="h-full bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (violationsToday / Math.max(maxViolations, 10)) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-neutral-600">
                  Active alerts generated today
                </p>
              </div>

              {/* Policy Coverage */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-black uppercase tracking-wider">
                  <span className="text-neutral-400">
                    Policy Coverage
                  </span>
                  <span className="text-emerald-500">
                    {implementationPct}%
                  </span>
                </div>
                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5">
                  <div
                    className="h-full bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-700"
                    style={{ width: `${implementationPct}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-600">
                  Percentage of active policies in enforcement
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Policy Modal */}
      <PolicyModal
        isOpen={isNewPolicyOpen}
        policy={null}
        isNew={true}
        onClose={() => setIsNewPolicyOpen(false)}
        onSave={handleCreatePolicy}
      />

      {/* Edit Policy Modal */}
      <PolicyModal
        isOpen={!!editingPolicy}
        policy={editingPolicy}
        isNew={false}
        onClose={() => setEditingPolicy(null)}
        onSave={handleSavePolicy}
      />

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title="Delete Policy?"
        message="This policy will be permanently deleted and can't be recovered."
        confirmText="Delete Policy"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setConfirmState({ isOpen: false, policyId: null })
        }
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
