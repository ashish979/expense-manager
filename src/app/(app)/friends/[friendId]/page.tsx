"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useExpenses } from "@/hooks/useExpenses";
import { useBalances } from "@/hooks/useBalances";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { formatCents } from "@/lib/csv-export";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function FriendDetailPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const { data: session } = useSession();

  const { data: user } = useQuery({
    queryKey: ["user", friendId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${friendId}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { data: expensesData, isLoading } = useExpenses();
  const { data: balances } = useBalances();

  const sharedExpenses = (expensesData?.expenses ?? []).filter(
    (e: any) =>
      e.splits.some((s: any) => s.userId === friendId) ||
      e.paidBy === friendId
  );

  const debt = (balances?.debts ?? []).find(
    (d: any) =>
      (d.from === session?.user?.id && d.to === friendId) ||
      (d.to === session?.user?.id && d.from === friendId)
  );
  const bal = debt
    ? debt.to === session?.user?.id
      ? debt.amount
      : -debt.amount
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/friends" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to friends
      </Link>

      {user && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 flex items-center gap-4">
          <Avatar src={user.image} name={user.name} size="lg" />
          <div>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          {bal !== 0 && (
            <div className="ml-auto text-right">
              <div className={`text-lg font-bold ${bal > 0 ? "text-emerald-600" : "text-red-600"}`}>
                {bal > 0 ? `They owe you ₹${formatCents(bal)}` : `You owe ₹${formatCents(-bal)}`}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h2 className="font-semibold mb-3">Shared expenses</h2>
        {isLoading ? (
          <ListSkeleton />
        ) : sharedExpenses.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            No shared expenses.
            <div className="mt-2">
              <Link href="/expenses/new">
                <Button size="sm" variant="secondary">Add expense</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {sharedExpenses.map((e: any) => (
              <Link
                key={e.id}
                href={`/expenses/${e.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{e.description}</div>
                  <div className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(e.date), { addSuffix: true })}
                  </div>
                </div>
                <div className="text-sm font-semibold">₹{formatCents(e.amount)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
