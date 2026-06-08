"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error && <Banner tone="error" title={error} />}
      <TextField
        id="project-name"
        label="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
      />
      <TextField
        id="project-city"
        label="City"
        helpText="Optional — used as the zone shown to vendors"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />
      <TextField
        id="project-type"
        label="Project type"
        helpText="Optional, e.g. Residential, Commercial, Industrial"
        value={type}
        onChange={(e) => setType(e.target.value)}
      />
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          Cancel
        </button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? props.mode === "create"
              ? "Creating…"
              : "Saving…"
            : props.mode === "create"
              ? "Create project"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
