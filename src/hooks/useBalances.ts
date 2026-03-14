import { useQuery } from "@tanstack/react-query";

async function fetchBalances(groupId?: string) {
  const url = groupId ? `/api/balances?groupId=${groupId}` : "/api/balances";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch balances");
  return res.json();
}

export function useBalances(groupId?: string) {
  return useQuery({
    queryKey: ["balances", groupId ?? "all"],
    queryFn: () => fetchBalances(groupId),
  });
}
