"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { getCroppedFile } from "@/lib/crop";
import {
  createBrandLogo,
  setBrandLogoActive,
  deleteBrandLogo,
} from "@/server/actions/brandLogos";
import type { ActionResult } from "@/server/types";

interface Logo {
  id: string;
  name: string;
  url: string;
  active: boolean;
}

interface Category {
  id: string;
  name: string;
  logos: Logo[];
}

export function BrandLogoManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Crop modal state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // The confirmed, cropped logo awaiting a name + submit
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

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

  function handleFilePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setImageSrc(URL.createObjectURL(file));
    // Allow re-selecting the same file later.
    event.target.value = "";
  }

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function confirmCrop() {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const file = await getCroppedFile(imageSrc, croppedAreaPixels);
      setPendingFile(file);
      setPendingPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      closeCropModal();
    } catch {
      setError("Could not crop the image. Try a different file.");
    }
  }

  function closeCropModal() {
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
    setCroppedAreaPixels(null);
  }

  function clearPending() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
  }

  function handleAdd() {
    if (!selectedCategoryId || !pendingFile || !name.trim()) return;
    const formData = new FormData();
    formData.set("categoryId", selectedCategoryId);
    formData.set("name", name.trim());
    formData.set("file", pendingFile);
    run(
      () => createBrandLogo(formData),
      () => {
        setName("");
        clearPending();
      },
    );
  }

  if (categories.length === 0) {
    return (
      <Banner tone="warning" title="No active categories">
        Add or activate a material category before managing brand logos.
      </Banner>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <Banner tone="error" title={error} />}

      {/* Category selector */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="brand-category"
          className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
        >
          Material category
        </label>
        <select
          id="brand-category"
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 sm:max-w-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Add logo */}
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Add a logo to {selectedCategory?.name}
        </h3>

        {pendingFile && pendingPreview ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img
                src={pendingPreview}
                alt="Cropped preview"
                className="h-24 w-24 rounded-md border border-zinc-200 object-cover dark:border-zinc-700"
              />
              <button
                type="button"
                onClick={clearPending}
                className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400"
              >
                Replace
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Brand name, e.g. UltraTech"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 sm:max-w-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              <Button
                type="button"
                variant="accent"
                disabled={isPending || !name.trim()}
                onClick={handleAdd}
              >
                Add logo
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFilePick}
              className="hidden"
            />
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Choose image to crop
            </Button>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              PNG, JPEG, or WebP up to 5 MB. You&apos;ll crop it to a square before adding.
            </p>
          </div>
        )}
      </div>

      {/* Existing logos for the selected category */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {selectedCategory?.name} logos
        </h3>
        {!selectedCategory || selectedCategory.logos.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No logos yet. Add the first one above.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {selectedCategory.logos.map((logo) => (
              <li
                key={logo.id}
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="relative mx-auto h-20 w-20">
                  <Image
                    src={logo.url}
                    alt={logo.name}
                    fill
                    sizes="80px"
                    className={`rounded-md object-cover ${logo.active ? "" : "opacity-40 grayscale"}`}
                  />
                </div>
                <p className="truncate text-center text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  {logo.name}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      run(() => setBrandLogoActive({ id: logo.id, active: !logo.active }))
                    }
                    className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    {logo.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => run(() => deleteBrandLogo({ id: logo.id }))}
                    className="text-xs font-medium text-red-600 underline hover:text-red-800 disabled:opacity-50 dark:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Crop modal */}
      {imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-lg flex-col gap-4 rounded-xl bg-white p-5 shadow-2xl dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Crop to a square
            </h3>
            <div className="relative h-72 w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-brand-accent"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeCropModal}>
                Cancel
              </Button>
              <Button type="button" variant="accent" onClick={confirmCrop}>
                Use crop
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
