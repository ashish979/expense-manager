"use client";

import { Suspense, useState } from "react";
import { useExpenses, useDeleteExpense } from "@/hooks/useExpenses";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { formatCents } from "@/lib/csv-export";
import { formatDistanceToNow } from "date-fns";
import { Plus, Receipt, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const { data, isLoading } = useExpenses(undefined, page);
  const deleteExpense = useDeleteExpense();
  const { toast } = useToast();

  const categoryColors: Record<string, "blue" | "green" | "yellow" | "red" | "gray"> = {
    food: "green", transport: "blue", accommodation: "yellow",
    entertainment: "blue", utilities: "gray", shopping: "yellow",
    health: "red", other: "gray",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" /> Add expense
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton count={6} />
      ) : data?.expenses?.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center">
          <Receipt className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No expenses yet.</p>
          <Button onClick={() => setShowAddModal(true)}>Add your first expense</Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {data?.expenses?.map((e: any) => {
              const myShare = e.splits.find((s: any) => s.userId === session?.user?.id);
              const iPaid = e.paidBy === session?.user?.id;
              return (
                <div key={e.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{e.description}</span>
                      <Badge color={categoryColors[e.category] ?? "gray"}>{e.category}</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {iPaid ? "You paid" : `${e.paidByUser?.name ?? "?"} paid`} ·{" "}
                      {formatDistanceToNow(new Date(e.date), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₹{formatCents(e.amount)}</div>
                    {myShare && (
                      <div className={`text-xs ${iPaid ? "text-emerald-600" : "text-red-500"}`}>
                        {iPaid ? `you lent ₹${formatCents(e.amount - myShare.amount)}` : `your share ₹${formatCents(myShare.amount)}`}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {e.createdBy === session?.user?.id && (
                      <>
                        <Link href={`/expenses/${e.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={deleteExpense.isPending}
                          onClick={() => {
                            if (confirm("Delete this expense?")) {
                              deleteExpense.mutate(e.id, {
                                onSuccess: () => toast("Expense deleted"),
                                onError: () => toast("Failed to delete", "error"),
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {data?.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                {page} / {data.pages}
              </span>
              <Button variant="secondary" size="sm" disabled={page === data.pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add expense">
        <Suspense fallback={<div className="py-8 text-center text-gray-400">Loading...</div>}>
          <ExpenseForm onSuccess={() => setShowAddModal(false)} />
        </Suspense>
      </Modal>
    </div>
  );
}
