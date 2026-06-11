"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/Banner";
import { createProject, updateProject } from "@/server/actions/projects";

interface CreateMode {
  mode: "create";
}

interface EditMode {
  mode: "edit";
  projectId: string;
  initial: { name: string; city: string; type: string };
}

type Props = CreateMode | EditMode;

export function ProjectForm(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initial =
    props.mode === "edit" ? props.initial : { name: "", city: "", type: "" };

  const [name, setName] = useState(initial.name);
  const [city, setCity] = useState(initial.city);
  const [type, setType] = useState(initial.type);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        name,
        city: city.trim() || undefined,
        type: type.trim() || undefined,
      };

      let result;
      if (props.mode === "edit") {
        result = await updateProject({ projectId: props.projectId, ...payload });
      } else {
        result = await createProject(payload);
      }

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (props.mode === "create") {
        router.push(`/builder/projects/${result.data.id}`);
      } else {
        router.push(`/builder/projects/${props.projectId}`);
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {error && <Banner tone="error" title={error} />}

      <FormField
        id="project-name"
        label="Project name"
        required
        hint={null}
      >
        <input
          id="project-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="e.g. Skyline Residency Phase 2"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      </FormField>

      <FormField
        id="project-type"
        label="Project type"
        hint="Optional · e.g. Residential, Commercial, Industrial"
      >
        <input
          id="project-type"
          type="text"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="e.g. Residential"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      </FormField>

      <FormField
        id="project-city"
        label="City"
        hint="Optional · Shown to vendors as a general zone"
      >
        <input
          id="project-city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Mumbai"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      </FormField>

      <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-4 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-accent-h disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {props.mode === "create" ? "Creating…" : "Saving…"}
            </>
          ) : props.mode === "create" ? (
            "Create project"
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </form>
  );
}

function FormField({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-stone-700 dark:text-zinc-300">
        {label}
        {required && <span className="ml-1 text-brand-accent">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-stone-500 dark:text-zinc-400">{hint}</p>}
    </div>
  );
}
