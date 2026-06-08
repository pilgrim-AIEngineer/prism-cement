export default function BuilderLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-12">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-300"
          role="status"
          aria-label="Loading"
        />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</span>
      </div>
    </div>
  );
}
