import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchFriends() {
  const res = await fetch("/api/friends");
  if (!res.ok) throw new Error("Failed to fetch friends");
  return res.json();
}

async function fetchFriendRequests() {
  const res = await fetch("/api/friends/requests");
  if (!res.ok) throw new Error("Failed to fetch requests");
  return res.json();
}

export function useFriends() {
  return useQuery({ queryKey: ["friends"], queryFn: fetchFriends });
}

export function useFriendRequests() {
  return useQuery({ queryKey: ["friendRequests"], queryFn: fetchFriendRequests });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to add friend");
      }
      return res.json();
    },
    onMutate: async (email) => {
      await qc.cancelQueries({ queryKey: ["friends"] });
      const prev = qc.getQueryData(["friends"]);
      qc.setQueryData(["friends"], (old: any[]) => [
        ...(old ?? []),
        { id: `temp-${Date.now()}`, email, name: email, status: "pending" },
      ]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["friends"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });
}

export function useRespondToRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "reject" }) => {
      const res = await fetch(`/api/friends/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed to respond");
      return res.json();
    },
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ["friendRequests"] });
      const prev = qc.getQueryData(["friendRequests"]);
      qc.setQueryData(["friendRequests"], (old: any[]) =>
        (old ?? []).filter((r) => r.id !== id)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["friendRequests"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["friends"] });
      qc.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });
}

export function useRemoveFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove friend");
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["friends"] });
      const prev = qc.getQueryData(["friends"]);
      qc.setQueryData(["friends"], (old: any[]) => (old ?? []).filter((f) => f.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["friends"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });
}
