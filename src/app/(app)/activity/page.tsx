"use client";

import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { formatDistanceToNow } from "date-fns";
import { Download } from "lucide-react";
import { useState } from "react";
import { formatCents } from "@/lib/csv-export";

const typeLabel: Record<string, string> = {
  expense_created: "added an expense",
  expense_updated: "updated an expense",
  expense_deleted: "deleted an expense",
  settlement_created: "recorded a payment",
  settlement_deleted: "reversed a payment",
  friend_added: "added a friend",
  group_created: "created a group",
  group_member_added: "added a member to",
  group_member_removed: "removed a member from",
};

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["activity", page],
    queryFn: async () => {
      const res = await fetch(`/api/activity?page=${page}&limit=20`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/activity?export=csv");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "activity.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activity</h1>
        <Button variant="secondary" size="sm" loading={exporting} onClick={handleExport}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton count={8} />
      ) : data?.activities?.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No activity yet.</div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {data?.activities?.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 p-4">
                <Avatar src={a.actor?.image} name={a.actor?.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <strong>{a.actor?.name ?? "Someone"}</strong>{" "}
                    {typeLabel[a.type] ?? a.type}
                    {a.metadata?.description && (
                      <span className="text-gray-500"> "{a.metadata.description}"</span>
                    )}
                    {a.metadata?.groupName && (
                      <span className="text-gray-500"> group "{a.metadata.groupName}"</span>
                    )}
                  </div>
                  {a.metadata?.amount && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      ₹{formatCents(a.metadata.amount as number)}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data?.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-gray-500">{page} / {data.pages}</span>
              <Button variant="secondary" size="sm" disabled={page === data.pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
