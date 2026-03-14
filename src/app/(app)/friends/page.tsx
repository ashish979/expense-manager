"use client";

import { useState } from "react";
import { useFriends, useSendFriendRequest, useRemoveFriend } from "@/hooks/useFriends";
import { useBalances } from "@/hooks/useBalances";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { formatCents } from "@/lib/csv-export";
import { UserPlus, Trash2 } from "lucide-react";
import Link from "next/link";

export default function FriendsPage() {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const { data: friends, isLoading } = useFriends();
  const { data: balances } = useBalances();
  const send = useSendFriendRequest();
  const remove = useRemoveFriend();
  const { toast } = useToast();

  const balanceMap = Object.fromEntries(
    (balances?.debts ?? []).map((d: any) => {
      if (d.from === session?.user?.id) return [d.to, -d.amount];
      if (d.to === session?.user?.id) return [d.from, d.amount];
      return [];
    })
  );

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    try {
      await send.mutateAsync(email.trim());
      toast("Friend added!");
      setEmail("");
    } catch (err: any) {
      toast(err.message, "error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Friends</h1>

      {/* Add friend */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Add a friend
        </h2>
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            className="flex-1"
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" loading={send.isPending} disabled={!email}>
            Add friend
          </Button>
        </form>
      </div>

      {/* Friends list */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h2 className="font-semibold mb-3">
          Friends {friends?.length ? `(${friends.length})` : ""}
        </h2>
        {isLoading ? (
          <ListSkeleton />
        ) : friends?.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No friends yet. Add one above!</p>
        ) : (
          <div className="space-y-1">
            {friends?.map((f: any) => {
              const bal = balanceMap[f.user.id] ?? 0;
              return (
                <Link
                  key={f.id}
                  href={`/friends/${f.user.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <Avatar src={f.user.image} name={f.user.name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{f.user.name}</div>
                    <div className="text-xs text-gray-500">{f.user.email}</div>
                  </div>
                  {bal !== 0 && (
                    <span className={`text-sm font-medium ${bal > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {bal > 0 ? "+" : ""}₹{formatCents(bal)}
                    </span>
                  )}
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-600 transition-all"
                    onClick={(e) => {
                      e.preventDefault();
                      remove.mutate(f.id, { onSuccess: () => toast("Friend removed") });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
