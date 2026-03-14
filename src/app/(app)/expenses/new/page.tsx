import { Suspense } from "react";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewExpensePage() {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link href="/expenses" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to expenses
      </Link>
      <h1 className="text-2xl font-bold">Add expense</h1>
      <Suspense fallback={<div className="animate-pulse h-96 bg-gray-100 dark:bg-gray-800 rounded-lg" />}>
        <ExpenseForm />
      </Suspense>
    </div>
  );
}
