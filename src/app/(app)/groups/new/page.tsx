"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useFriends } from "@/hooks/useFriends";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const schema = z.object({
  name: z.string().min(1, "Name required").max(100),
  category: z.enum(["home", "trip", "couple", "work", "other"]),
  simplifyDebts: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function NewGroupPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: friends } = useFriends();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: "other", simplifyDebts: false },
  });

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, memberIds: selectedMembers }),
      });
      if (!res.ok) throw new Error("Failed to create group");
      const group = await res.json();
      qc.invalidateQueries({ queryKey: ["groups"] });
      toast("Group created!");
      router.push(`/groups/${group.id}`);
    } catch {
      toast("Failed to create group", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link href="/groups" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to groups
      </Link>

      <h1 className="text-2xl font-bold">Create group</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <Input label="Group name" {...register("name")} error={errors.name?.message} placeholder="e.g. Summer trip" />

        <Select label="Category" {...register("category")}>
          <option value="home">Home</option>
          <option value="trip">Trip</option>
          <option value="couple">Couple</option>
          <option value="work">Work</option>
          <option value="other">Other</option>
        </Select>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("simplifyDebts")} className="rounded" />
          Simplify debts
        </label>

        {friends?.length > 0 && (
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

        <Button type="submit" loading={loading} className="w-full">
          Create group
        </Button>
      </form>
    </div>
  );
}
