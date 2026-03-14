"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { Plus, UsersRound, Trash2, Settings } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function GroupsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: groups, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      toast("Group deleted");
    },
    onError: () => toast("Failed to delete group", "error"),
  });

  const categoryColors: Record<string, "blue" | "green" | "yellow" | "red" | "gray"> = {
    home: "blue",
    trip: "green",
    couple: "red",
    work: "yellow",
    other: "gray",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Link href="/groups/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> New group
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : groups?.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center">
          <UsersRound className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No groups yet.</p>
          <Link href="/groups/new">
            <Button>Create your first group</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {groups?.map((g: any) => {
            const isAdmin = g.members.some(
              (m: any) => m.userId === session?.user?.id && m.role === "admin"
            );
            return (
              <div
                key={g.id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <UsersRound className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/groups/${g.id}`} className="font-semibold hover:text-emerald-600">
                        {g.name}
                      </Link>
                      <Badge color={categoryColors[g.category] ?? "gray"}>{g.category}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {g.members.length} member{g.members.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <>
                        <Link href={`/groups/${g.id}/settings`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={deleteGroup.isPending}
                          onClick={() => {
                            if (confirm(`Delete "${g.name}"?`)) {
                              deleteGroup.mutate(g.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
