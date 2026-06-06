export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">BuildBid</h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Admin-brokered, double-blind building-material procurement marketplace.
        Skeleton scaffold — see <code>CLAUDE.md</code> for conventions.
      </p>
    </main>
  );
}
