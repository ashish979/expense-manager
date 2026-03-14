"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { name: "", category: "other", simplifyDebts: false },
  });

  useEffect(() => {
    if (group) reset({ name: group.name, category: group.category, simplifyDebts: group.simplifyDebts });
  }, [group, reset]);

  async function onSubmit(data: any) {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      qc.invalidateQueries({ queryKey: ["group", groupId] });
      qc.invalidateQueries({ queryKey: ["groups"] });
      toast("Group updated!");
      router.push(`/groups/${groupId}`);
    } catch {
      toast("Failed to update group", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link href={`/groups/${groupId}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to group
      </Link>

      <h1 className="text-2xl font-bold">Group settings</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <Input label="Group name" {...register("name")} />
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
        <Button type="submit" loading={loading} className="w-full">
          Save changes
        </Button>
      </form>
    </div>
  );
}
