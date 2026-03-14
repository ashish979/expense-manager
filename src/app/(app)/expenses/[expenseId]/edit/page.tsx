"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function EditExpensePage() {
  const { expenseId } = useParams<{ expenseId: string }>();

  const { data: expense, isLoading } = useQuery({
    queryKey: ["expense", expenseId],
    queryFn: async () => {
      const res = await fetch(`/api/expenses/${expenseId}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="max-w-lg mx-auto animate-pulse h-64 rounded-xl bg-gray-200 dark:bg-gray-800" />;
  }

  if (!expense) {
    return <div className="text-center py-20 text-gray-400">Expense not found.</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link href={`/expenses/${expenseId}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold">Edit expense</h1>
      <ExpenseForm
        expenseId={expenseId}
        mode="edit"
        defaultValues={{
          description: expense.description,
          amountStr: (expense.amount / 100).toFixed(2),
          category: expense.category,
          date: format(new Date(expense.date), "yyyy-MM-dd"),
          groupId: expense.groupId,
          paidBy: expense.paidBy,
          splitType: expense.splitType,
          notes: expense.notes,
          participants: expense.splits.map((s: any) => ({
            userId: s.userId,
            name: s.user?.name ?? "?",
            image: s.user?.image,
            amount: s.amount,
            percentage: s.percentage ?? 0,
            shares: s.shares ?? 1,
          })),
        }}
      />
    </div>
  );
}
