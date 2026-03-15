"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useFriends } from "@/hooks/useFriends";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";

const schema = z.object({
  description: z.string().min(1, "Required"),
  amountStr: z.string().min(1, "Required"),
  category: z.enum(["food", "transport", "accommodation", "entertainment", "utilities", "shopping", "health", "other"]),
  date: z.string(),
  groupId: z.string().optional(),
  paidBy: z.string(),
  splitType: z.enum(["equal", "unequal", "percentage", "shares"]),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Participant {
  userId: string;
  name: string;
  image?: string;
  amount: number;
  percentage: number;
  shares: number;
}

interface ExpenseFormProps {
  defaultValues?: Partial<FormData & { participants?: Participant[] }>;
  expenseId?: string;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

export function ExpenseForm({ defaultValues, expenseId, mode = "create", onSuccess }: ExpenseFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: friends } = useFriends();
  const [loading, setLoading] = useState(false);

  const preselectedGroupId = searchParams.get("groupId") ?? defaultValues?.groupId;

  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: defaultValues?.description ?? "",
      amountStr: defaultValues?.amountStr ?? "",
      category: defaultValues?.category ?? "other",
      date: defaultValues?.date ?? new Date().toISOString().slice(0, 10),
      groupId: preselectedGroupId ?? "",
      paidBy: defaultValues?.paidBy ?? session?.user?.id ?? "",
      splitType: defaultValues?.splitType ?? "equal",
      notes: defaultValues?.notes ?? "",
    },
  });

  const splitType = watch("splitType");
  const groupId = watch("groupId");
  const amountStr = watch("amountStr");
  const paidBy = watch("paidBy");

  // Available participants: current user + friends (or group members)
  const me = session?.user ? {
    userId: session.user.id!,
    name: session.user.name ?? "You",
    image: session.user.image ?? undefined,
  } : null;

  const selectedGroup = groups?.find((g: any) => g.id === groupId);
  const candidateParticipants = selectedGroup
    ? selectedGroup.members.map((m: any) => ({
        userId: m.userId,
        name: m.user?.name ?? "?",
        image: m.user?.image,
      }))
    : [
        ...(me ? [me] : []),
        ...(friends ?? []).map((f: any) => ({
          userId: f.user.id,
          name: f.user.name,
          image: f.user.image,
        })),
      ];

  const [participants, setParticipants] = useState<Participant[]>(() => {
    if (defaultValues?.participants) return defaultValues.participants;
    return (me ? [{ userId: me.userId, name: me.name, image: me.image, amount: 0, percentage: 0, shares: 1 }] : []);
  });

  const totalCents = Math.round(parseFloat(amountStr || "0") * 100);

  // Recalculate equal splits when amount or participants change
  useEffect(() => {
    if (splitType === "equal" && participants.length > 0 && totalCents > 0) {
      const base = Math.floor(totalCents / participants.length);
      const remainder = totalCents - base * participants.length;
      setParticipants((prev) =>
        prev.map((p, i) => ({
          ...p,
          amount: i === 0 ? base + remainder : base,
          percentage: 100 / prev.length,
        }))
      );
    }
  }, [splitType, totalCents, participants.length]);

  const toggleParticipant = (candidate: { userId: string; name: string; image?: string }) => {
    setParticipants((prev) => {
      const existing = prev.find((p) => p.userId === candidate.userId);
      if (existing) return prev.filter((p) => p.userId !== candidate.userId);
      return [...prev, { userId: candidate.userId, name: candidate.name, image: candidate.image, amount: 0, percentage: 0, shares: 1 }];
    });
  };

  const updateParticipant = (userId: string, field: keyof Pick<Participant, "amount" | "percentage" | "shares">, value: number) => {
    setParticipants((prev) => prev.map((p) => p.userId === userId ? { ...p, [field]: value } : p));
  };

  async function onSubmit(data: FormData) {
    if (participants.length === 0) {
      toast("Add at least one participant", "error");
      return;
    }

    const participantPayload = participants.map((p) => ({
      userId: p.userId,
      amount: splitType === "unequal" ? p.amount : undefined,
      percentage: splitType === "percentage" ? p.percentage : undefined,
      shares: splitType === "shares" ? p.shares : undefined,
    }));

    const payload = {
      description: data.description,
      amount: totalCents,
      category: data.category,
      date: new Date(data.date).toISOString(),
      groupId: data.groupId || undefined,
      paidBy: data.paidBy,
      splitType: data.splitType,
      participants: participantPayload,
      notes: data.notes,
    };

    setLoading(true);
    try {
      const url = mode === "edit" ? `/api/expenses/${expenseId}` : "/api/expenses";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      toast(mode === "edit" ? "Expense updated!" : "Expense added!");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(data.groupId ? `/groups/${data.groupId}` : "/expenses");
      }
    } catch (err: any) {
      toast(err.message ?? "Failed to save expense", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <Input label="Description" {...register("description")} error={errors.description?.message} placeholder="e.g. Dinner, Hotel, Groceries" />

      <div className="grid grid-cols-2 gap-4">
        <Input label="Amount (₹)" {...register("amountStr")} error={errors.amountStr?.message} type="number" step="0.01" min="0.01" placeholder="0.00" />
        <Input label="Date" {...register("date")} type="date" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select label="Category" {...register("category")}>
          {["food", "transport", "accommodation", "entertainment", "utilities", "shopping", "health", "other"].map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </Select>
        <Select label="Split type" {...register("splitType")}>
          <option value="equal">Equal</option>
          <option value="unequal">Unequal amounts</option>
          <option value="percentage">By percentage</option>
          <option value="shares">By shares</option>
        </Select>
      </div>

      {groups?.length > 0 && (
        <Select label="Group (optional)" {...register("groupId")}>
          <option value="">No group</option>
          {groups.map((g: any) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </Select>
      )}

      {/* Paid by */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Paid by</label>
        <Select {...register("paidBy")}>
          {candidateParticipants.map((p: any) => (
            <option key={p.userId} value={p.userId}>
              {p.userId === session?.user?.id ? "You" : p.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Participants */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
          Split between
        </label>
        <div className="space-y-2 border rounded-lg p-3 dark:border-gray-700">
          {candidateParticipants.map((candidate: any) => {
            const selected = participants.find((p) => p.userId === candidate.userId);
            return (
              <div key={candidate.userId} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!selected}
                  onChange={() => toggleParticipant(candidate)}
                  className="rounded"
                />
                <Avatar src={candidate.image} name={candidate.name} size="sm" />
                <span className="flex-1 text-sm">
                  {candidate.userId === session?.user?.id ? "You" : candidate.name}
                </span>
                {selected && splitType === "unequal" && (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-24 rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                    value={selected.amount / 100}
                    onChange={(e) => updateParticipant(candidate.userId, "amount", Math.round(parseFloat(e.target.value || "0") * 100))}
                    placeholder="₹0.00"
                  />
                )}
                {selected && splitType === "percentage" && (
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    className="w-20 rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                    value={selected.percentage}
                    onChange={(e) => updateParticipant(candidate.userId, "percentage", parseFloat(e.target.value || "0"))}
                    placeholder="%"
                  />
                )}
                {selected && splitType === "shares" && (
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className="w-20 rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                    value={selected.shares}
                    onChange={(e) => updateParticipant(candidate.userId, "shares", parseInt(e.target.value || "1"))}
                    placeholder="shares"
                  />
                )}
                {selected && splitType === "equal" && (
                  <span className="text-sm text-gray-500 w-20 text-right">
                    ₹{((selected.amount) / 100).toFixed(2)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Input label="Notes (optional)" {...register("notes")} placeholder="Add a note..." />

      <Button type="submit" loading={loading} className="w-full">
        {mode === "edit" ? "Update expense" : "Add expense"}
      </Button>
    </form>
  );
}
