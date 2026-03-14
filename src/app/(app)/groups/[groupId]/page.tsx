"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useExpenses } from "@/hooks/useExpenses";
import { useBalances } from "@/hooks/useBalances";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { formatCents } from "@/lib/csv-export";
import { formatDistanceToNow } from "date-fns";
import { Plus, ArrowLeft, Settings, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { data: session } = useSession();

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { data: expensesData, isLoading: expLoading } = useExpenses(groupId);
  const { data: balances } = useBalances(groupId);

  const isAdmin = group?.members?.some(
    (m: any) => m.userId === session?.user?.id && m.role === "admin"
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/groups" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to groups
      </Link>

      {groupLoading ? (
        <div className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
      ) : group ? (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <Badge color="gray">{group.category}</Badge>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Link href={`/groups/${groupId}/settings`}>
                <Button variant="secondary" size="sm">
                  <Settings className="h-4 w-4" /> Settings
                </Button>
              </Link>
            )}
            <Link href={`/expenses/new?groupId=${groupId}`}>
              <Button size="sm">
                <Plus className="h-4 w-4" /> Add expense
              </Button>
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Members */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h2 className="font-semibold mb-3">Members ({group?.members?.length ?? 0})</h2>
          <div className="space-y-2">
            {group?.members?.map((m: any) => (
              <div key={m.userId} className="flex items-center gap-2">
                <Avatar src={m.user?.image} name={m.user?.name} size="sm" />
                <div className="flex-1">
                  <span className="text-sm font-medium">{m.user?.name ?? "Unknown"}</span>
                  {m.role === "admin" && <Badge color="blue">Admin</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Simplified debts */}
        {balances?.simplified && balances.simplified.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h2 className="font-semibold mb-3">Who owes who</h2>
            <div className="space-y-2">
              {balances.simplified.map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{d.fromUser?.name ?? "?"}</span>
                  <ArrowLeftRight className="h-3 w-3 text-gray-400" />
                  <span className="font-medium">{d.toUser?.name ?? "?"}</span>
                  <span className="ml-auto font-semibold text-red-600">₹{formatCents(d.amount)}</span>
                </div>
              ))}
            </div>
            <Link href="/settlements">
              <Button variant="secondary" size="sm" className="w-full mt-3">
                Record settlement
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Expenses */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h2 className="font-semibold mb-3">Expenses</h2>
        {expLoading ? (
          <ListSkeleton />
        ) : expensesData?.expenses?.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            No expenses yet.
          </div>
        ) : (
          <div className="space-y-1">
            {expensesData?.expenses?.map((e: any) => (
              <Link
                key={e.id}
                href={`/expenses/${e.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{e.description}</div>
                  <div className="text-xs text-gray-500">
                    Paid by {e.paidByUser?.name ?? "?"} ·{" "}
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
