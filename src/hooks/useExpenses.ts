import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExpenseDTO } from "@/types";

async function fetchExpenses(groupId?: string, page = 1) {
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (groupId) params.set("groupId", groupId);
  const res = await fetch(`/api/expenses?${params}`);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

export function useExpenses(groupId?: string, page = 1) {
  return useQuery({
    queryKey: ["expenses", groupId ?? "all", page],
    queryFn: () => fetchExpenses(groupId, page),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["expenses"] });
      const prev = qc.getQueriesData({ queryKey: ["expenses"] });
      qc.setQueriesData({ queryKey: ["expenses"] }, (old: any) => {
        if (!old?.expenses) return old;
        return { ...old, expenses: old.expenses.filter((e: ExpenseDTO) => e.id !== id) };
      });
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      ctx?.prev?.forEach(([k, v]) => qc.setQueryData(k, v));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
    },
  });
}
