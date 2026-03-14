"use client";

import { useSession, signOut } from "next-auth/react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { LogOut } from "lucide-react";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit } = useForm({
    defaultValues: { name: session?.user?.name ?? "", currency: "INR" },
  });

  async function onSubmit(data: { name: string; currency: string }) {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${session?.user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, currency: data.currency }),
      });
      if (!res.ok) throw new Error("Failed");
      await update({ name: data.name });
      toast("Profile updated!");
    } catch {
      toast("Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar src={session?.user?.image} name={session?.user?.name ?? ""} size="lg" />
          <div>
            <div className="font-semibold text-lg">{session?.user?.name}</div>
            <div className="text-sm text-gray-500">{session?.user?.email}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Display name" {...register("name")} />
          <Select label="Currency" {...register("currency")}>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="AUD">AUD (A$)</option>
            <option value="CAD">CAD (C$)</option>
          </Select>
          <Button type="submit" loading={loading} className="w-full">
            Save changes
          </Button>
        </form>

        <div className="border-t dark:border-gray-800 pt-4">
          <Button
            variant="danger"
            className="w-full"
            onClick={() => signOut({ callbackUrl: "/signin" })}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
