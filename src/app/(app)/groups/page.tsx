"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useFriends } from "@/hooks/useFriends";
import { Plus, UsersRound, Trash2, Settings } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const newGroupSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  category: z.enum(["home", "trip", "couple", "work", "other"]),
  simplifyDebts: z.boolean(),
});

export default function GroupsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: friends } = useFriends();
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const { register: registerGroup, handleSubmit: handleGroupSubmit, reset: resetGroupForm, formState: { errors: groupErrors } } = useForm<z.infer<typeof newGroupSchema>>({
    resolver: zodResolver(newGroupSchema),
    defaultValues: { category: "other", simplifyDebts: false },
  });

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  async function onGroupSubmit(data: z.infer<typeof newGroupSchema>) {
    setCreatingGroup(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, memberIds: selectedMembers }),
      });
      if (!res.ok) throw new Error("Failed to create group");
      qc.invalidateQueries({ queryKey: ["groups"] });
      toast("Group created!");
      setShowNewGroupModal(false);
      resetGroupForm();
      setSelectedMembers([]);
    } catch {
      toast("Failed to create group", "error");
    } finally {
      setCreatingGroup(false);
    }
  }

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
        <Button size="sm" onClick={() => setShowNewGroupModal(true)}>
          <Plus className="h-4 w-4" /> New group
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : groups?.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center">
          <UsersRound className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No groups yet.</p>
          <Button onClick={() => setShowNewGroupModal(true)}>Create your first group</Button>
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
      <Modal open={showNewGroupModal} onClose={() => setShowNewGroupModal(false)} title="New group">
        <form onSubmit={handleGroupSubmit(onGroupSubmit)} className="space-y-4">
          <Input label="Group name" {...registerGroup("name")} error={groupErrors.name?.message} placeholder="e.g. Summer trip" />

          <Select label="Category" {...registerGroup("category")}>
            <option value="home">Home</option>
            <option value="trip">Trip</option>
            <option value="couple">Couple</option>
            <option value="work">Work</option>
            <option value="other">Other</option>
          </Select>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...registerGroup("simplifyDebts")} className="rounded" />
            Simplify debts
          </label>

          {friends && friends.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                Add members
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2 dark:border-gray-700">
                {friends.map((f: any) => (
                  <label key={f.user.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(f.user.id)}
                      onChange={() => toggleMember(f.user.id)}
                      className="rounded"
                    />
                    <span>{f.user.name}</span>
                    <span className="text-gray-400 text-xs">({f.user.email})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button type="submit" loading={creatingGroup} className="w-full">
            Create group
          </Button>
        </form>
      </Modal>
    </div>
  );
}
