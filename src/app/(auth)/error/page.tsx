export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Authentication Error</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {error === "OAuthAccountNotLinked"
            ? "This email is already linked to a different provider."
            : "Something went wrong. Please try again."}
        </p>
        <a href="/signin" className="text-emerald-600 underline">
          Back to sign in
        </a>
      </div>
    </div>
  );
}
