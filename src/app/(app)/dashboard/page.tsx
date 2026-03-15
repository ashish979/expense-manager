"use client";

import { Suspense, useState } from "react";
import { useBalances } from "@/hooks/useBalances";
import { useExpenses } from "@/hooks/useExpenses";
import { CardSkeleton, ListSkeleton } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { formatCents } from "@/lib/csv-export";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useSession } from "next-auth/react";

function AmountBadge({ cents }: { cents: number }) {
  if (cents === 0) return <Badge color="gray">Settled up</Badge>;
  if (cents > 0) return <Badge color="green">+₹{formatCents(cents)}</Badge>;
  return <Badge color="red">-₹{formatCents(-cents)}</Badge>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: balances, isLoading: balLoading } = useBalances();
  const { data: expensesData, isLoading: expLoading } = useExpenses();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Hi, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" /> Add expense
        </Button>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {balLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                You are owed
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                ₹{formatCents(balances?.totalOwed ?? 0)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <TrendingDown className="h-4 w-4 text-red-500" />
                You owe
              </div>
              <div className="text-2xl font-bold text-red-600">
                ₹{formatCents(balances?.totalOwe ?? 0)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Minus className="h-4 w-4 text-gray-400" />
                Net balance
              </div>
              <div className={`text-2xl font-bold ${(balances?.net ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {(balances?.net ?? 0) >= 0 ? "+" : ""}₹{formatCents(balances?.net ?? 0)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Who owes whom */}
      {balances?.debts?.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h2 className="font-semibold mb-3">Outstanding balances</h2>
          <div className="space-y-2">
            {balances.debts.slice(0, 5).map((d: any, i: number) => {
              const isFromMe = d.from === session?.user?.id;
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar src={isFromMe ? d.toUser?.image : d.fromUser?.image} name={isFromMe ? d.toUser?.name : d.fromUser?.name} size="sm" />
                    <span>
                      {isFromMe ? (
                        <>You owe <strong>{d.toUser?.name ?? "someone"}</strong></>
                      ) : (
                        <><strong>{d.fromUser?.name ?? "someone"}</strong> owes you</>
                      )}
                    </span>
                  </div>
                  <AmountBadge cents={isFromMe ? -d.amount : d.amount} />
                </div>
              );
            })}
          </div>
          {balances.debts.length > 5 && (
            <Link href="/settlements" className="text-sm text-emerald-600 hover:underline mt-2 block">
              View all →
            </Link>
          )}
        </div>
      )}

      {/* Recent expenses */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Recent expenses</h2>
          <Link href="/expenses" className="text-sm text-emerald-600 hover:underline">
            View all
          </Link>
        </div>
        {expLoading ? (
          <ListSkeleton count={4} />
        ) : expensesData?.expenses?.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No expenses yet.</p>
            <Button variant="secondary" size="sm" className="mt-2" onClick={() => setShowAddModal(true)}>
              Add your first expense
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {expensesData?.expenses?.slice(0, 6).map((e: any) => (
              <Link
                key={e.id}
                href={`/expenses/${e.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{e.description}</div>
                  <div className="text-xs text-gray-500">
                    {e.paidByUser?.name ?? "Unknown"} ·{" "}
                    {formatDistanceToNow(new Date(e.date), { addSuffix: true })}
                  </div>
                </div>
                <div className="text-sm font-semibold">₹{formatCents(e.amount)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add expense">
        <Suspense fallback={<div className="py-8 text-center text-gray-400">Loading...</div>}>
          <ExpenseForm onSuccess={() => setShowAddModal(false)} />
        </Suspense>
      </Modal>
    </div>
  );
}
