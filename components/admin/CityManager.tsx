"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { createCity, setCityActive } from "@/server/actions/cities";
import type { ActionResult } from "@/server/types";

interface City {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

export function CityManager({ cities }: { cities: City[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<ActionResult<unknown>>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onOk?.();
      router.refresh();
    });
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    run(() => createCity({ name }), () => setName(""));
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <Banner tone="error" title={error} />}

      <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a launch city, e.g. Mumbai"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 sm:max-w-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <Button type="submit" variant="accent" disabled={isPending || !name.trim()}>
          Add city
        </Button>
      </form>

      {cities.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No cities yet. Add your first launch city above.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cities.map((city) => (
            <li
              key={city.id}
              className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{city.name}</span>
                {city.active ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    Inactive
                  </span>
                )}
                <span className="font-mono text-xs text-zinc-400">{city.slug}</span>
              </div>
              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() => run(() => setCityActive({ cityId: city.id, active: !city.active }))}
              >
                {city.active ? "Deactivate" : "Activate"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
