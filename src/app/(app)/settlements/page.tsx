"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useBalances } from "@/hooks/useBalances";
import { useFriends } from "@/hooks/useFriends";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { formatCents } from "@/lib/csv-export";
import { formatDistanceToNow } from "date-fns";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function SettlementsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: balances } = useBalances();
  const { data: friends } = useFriends();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ paidTo: "", amount: "", notes: "" });

  const { data: settlements, isLoading } = useQuery({
    queryKey: ["settlements"],
    queryFn: async () => {
      const res = await fetch("/api/settlements");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const create = useMutation({
    mutationFn: async (data: { paidTo: string; amount: number; notes: string }) => {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settlements"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      toast("Settlement recorded!");
      setModalOpen(false);
      setForm({ paidTo: "", amount: "", notes: "" });
    },
    onError: () => toast("Failed to record settlement", "error"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settlements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["settlements"] });
      const prev = qc.getQueryData(["settlements"]);
      qc.setQueryData(["settlements"], (old: any[]) => (old ?? []).filter((s) => s.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["settlements"], ctx.prev);
      toast("Failed to delete", "error");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["settlements"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      toast("Settlement deleted");
    },
  });

  function handleSettle(debt: any) {
    const isMePaying = debt.from === session?.user?.id;
    if (!isMePaying) return; // only settle your own debts
    setForm({ paidTo: debt.to, amount: (debt.amount / 100).toFixed(2), notes: "" });
    setModalOpen(true);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settlements</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Record payment
        </Button>
      </div>

      {/* Outstanding debts */}
      {balances?.debts?.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h2 className="font-semibold mb-3">Outstanding</h2>
          <div className="space-y-2">
            {balances.debts.map((d: any, i: number) => {
              const isMePaying = d.from === session?.user?.id;
              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <Avatar src={isMePaying ? d.toUser?.image : d.fromUser?.image} name={isMePaying ? d.toUser?.name : d.fromUser?.name} size="sm" />
                  <div className="flex-1">
                    {isMePaying ? (
                      <span>You owe <strong>{d.toUser?.name}</strong></span>
                    ) : (
                      <span><strong>{d.fromUser?.name}</strong> owes you</span>
                    )}
                  </div>
                  <span className={`font-semibold ${isMePaying ? "text-red-600" : "text-emerald-600"}`}>
                    ₹{formatCents(d.amount)}
                  </span>
                  {isMePaying && (
                    <Button size="sm" variant="secondary" onClick={() => handleSettle(d)}>
                      Settle up
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h2 className="font-semibold mb-3">History</h2>
        {isLoading ? (
          <ListSkeleton />
        ) : settlements?.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No settlements yet.</p>
        ) : (
          <div className="space-y-1">
            {settlements?.map((s: any) => {
              const iPaid = s.paidBy === session?.user?.id;
              return (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 group">
                  <Avatar src={iPaid ? s.paidToUser?.image : s.paidByUser?.image} name={iPaid ? s.paidToUser?.name : s.paidByUser?.name} size="sm" />
                  <div className="flex-1 text-sm">
                    <div>
                      {iPaid ? (
                        <span>You paid <strong>{s.paidToUser?.name}</strong></span>
                      ) : (
                        <span><strong>{s.paidByUser?.name}</strong> paid you</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <span className={`font-semibold ${iPaid ? "text-red-600" : "text-emerald-600"}`}>
                    ₹{formatCents(s.amount)}
                  </span>
                  {iPaid && (
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
                      onClick={() => remove.mutate(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record payment">
        <div className="space-y-4">
          <Select
            label="Paid to"
            value={form.paidTo}
            onChange={(e) => setForm((f) => ({ ...f, paidTo: e.target.value }))}
          >
            <option value="">Select person</option>
            {friends?.map((f: any) => (
              <option key={f.user.id} value={f.user.id}>{f.user.name}</option>
            ))}
          </Select>
          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
          />
          <Input
            label="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Cash, bank transfer..."
          />
          <Button
            className="w-full"
            loading={create.isPending}
            disabled={!form.paidTo || !form.amount}
            onClick={() =>
              create.mutate({
                paidTo: form.paidTo,
                amount: Math.round(parseFloat(form.amount) * 100),
                notes: form.notes,
              })
            }
          >
            Record payment
          </Button>
        </div>
      </Modal>
    </div>
  );
}
