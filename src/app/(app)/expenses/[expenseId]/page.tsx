"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useDeleteExpense } from "@/hooks/useExpenses";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatCents } from "@/lib/csv-export";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

export default function ExpenseDetailPage() {
  const { expenseId } = useParams<{ expenseId: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const deleteExpense = useDeleteExpense();

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

  const canEdit = expense.createdBy === session?.user?.id;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link href="/expenses" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to expenses
      </Link>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{expense.description}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge color="gray">{expense.category}</Badge>
              <span className="text-sm text-gray-500">{format(new Date(expense.date), "MMM d, yyyy")}</span>
            </div>
          </div>
          <div className="text-2xl font-bold">₹{formatCents(expense.amount)}</div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Paid by</span>
          <Avatar src={expense.paidByUser?.image} name={expense.paidByUser?.name} size="sm" />
          <span className="font-medium">{expense.paidByUser?.name ?? "Unknown"}</span>
        </div>

        <div className="border-t dark:border-gray-800 pt-4">
          <div className="text-sm font-medium text-gray-500 mb-2">
            Split ({expense.splitType})
          </div>
          <div className="space-y-2">
            {expense.splits.map((s: any) => (
              <div key={s.userId} className="flex items-center gap-2">
                <Avatar src={s.user?.image} name={s.user?.name} size="sm" />
                <span className="flex-1 text-sm">{s.user?.name ?? "Unknown"}</span>
                <span className="font-semibold">₹{formatCents(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {expense.notes && (
          <div className="text-sm text-gray-500 border-t dark:border-gray-800 pt-3">
            Note: {expense.notes}
          </div>
        )}

        {canEdit && (
          <div className="flex gap-2 pt-2 border-t dark:border-gray-800">
            <Link href={`/expenses/${expenseId}/edit`} className="flex-1">
              <Button variant="secondary" className="w-full">
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            </Link>
            <Button
              variant="danger"
              className="flex-1"
              loading={deleteExpense.isPending}
              onClick={() => {
                if (confirm("Delete this expense?")) {
                  deleteExpense.mutate(expenseId, {
                    onSuccess: () => {
                      toast("Expense deleted");
                      router.push("/expenses");
                    },
                    onError: () => toast("Failed to delete", "error"),
                  });
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
