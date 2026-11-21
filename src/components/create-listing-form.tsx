"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORIES,
  DEFAULT_LOCATION,
  MAX_DESCRIPTION,
  MAX_LOCATION,
  MAX_TITLE,
  PHOTO_TYPES,
  formatPrice,
  parsePrice,
  validateListing,
  validatePhoto,
  type FieldErrors,
  type ListingInput,
} from "@/lib/listings";
import { PHOTO_BUCKET, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const EMPTY = { title: "", description: "", price: "", category: "", email: "", location: "" };
const FIELD_ORDER: (keyof ListingInput)[] = ["hasPhoto", "title", "price", "category", "description", "location", "email"];

export function CreateListingForm() {
  const router = useRouter();
  const [fields, setFields] = useState(EMPTY);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Free the preview image's memory when it is replaced or the page closes.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    // Clear a field's error as soon as the seller edits it; Publish checks everything again.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  function choosePhoto(file: File | undefined) {
    if (!file) return;
    const problem = validatePhoto(file);
    if (problem) {
      setErrors((e) => ({ ...e, hasPhoto: problem }));
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setErrors((e) => ({ ...e, hasPhoto: undefined }));
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    setPhoto(null);
    setPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function publish(e: { preventDefault(): void }) {
    e.preventDefault();
    const problems = validateListing({ ...fields, hasPhoto: !!photo });
    setErrors(problems);
    const firstProblem = FIELD_ORDER.find((k) => problems[k]);
    if (firstProblem || !photo) {
      document.getElementById(firstProblem === "hasPhoto" ? "photo" : firstProblem ?? "photo")?.focus();
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, photo, { contentType: photo.type, upsert: false });
      if (uploadError) throw new Error("The photo didn't upload. Try a smaller image.");
      const imageUrl = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

      const { data, error } = await supabase
        .from("listings")
        .insert({
          title: fields.title.trim(),
          description: fields.description.trim() || null,
          price: parsePrice(fields.price),
          category: fields.category,
          seller_email: fields.email.trim(),
          image_url: imageUrl,
          location: fields.location.trim() || DEFAULT_LOCATION,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error("Your listing wasn't saved. Please try again.");

      router.push(`/item/${data.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const price = parsePrice(fields.price);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 p-4 lg:flex-row lg:items-start">
      <form
        onSubmit={publish}
        noValidate
        className="flex w-full flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm lg:sticky lg:top-18 lg:w-[400px] lg:shrink-0"
        aria-label="Create new listing"
      >
        <div>
          <h1 className="text-2xl font-bold">Item for sale</h1>
          <p className="text-sm text-muted-foreground">No account needed. Buyers will message you at your email.</p>
        </div>

        {/* Photo: click to choose, or drag and drop. */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Photo</span>
          {preview ? (
            <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a file not uploaded yet */}
              <img src={preview} alt="Photo you chose" className="size-full object-contain" />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={removePhoto}
                className="absolute top-2 right-2 rounded-full bg-white/90 shadow"
                aria-label="Remove photo"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <label
              htmlFor="photo"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                choosePhoto(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted text-center transition-colors hover:bg-secondary",
                dragging && "border-primary bg-accent",
                errors.hasPhoto && "border-destructive"
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-secondary">
                <ImagePlus className="size-5" aria-hidden="true" />
              </span>
              <span className="font-semibold">Add photo</span>
              <span className="text-xs text-muted-foreground">or drag and drop · JPG, PNG, GIF or WebP up to 5 MB</span>
            </label>
          )}
          <input
            ref={fileInput}
            id="photo"
            type="file"
            accept={PHOTO_TYPES.join(",")}
            className="sr-only"
            onChange={(e) => choosePhoto(e.target.files?.[0])}
            aria-invalid={!!errors.hasPhoto}
            aria-describedby={errors.hasPhoto ? "photo-error" : undefined}
          />
          {errors.hasPhoto && <p id="photo-error" className="text-sm text-destructive">{errors.hasPhoto}</p>}
        </div>

        <Field id="title" label="Title" error={errors.title}>
          <Input id="title" value={fields.title} onChange={(e) => set("title", e.target.value)} maxLength={MAX_TITLE} placeholder="What are you selling?" {...invalid("title", errors.title)} />
        </Field>

        <Field id="price" label="Price (USD)" error={errors.price}>
          <Input id="price" inputMode="decimal" value={fields.price} onChange={(e) => set("price", e.target.value)} placeholder="0 for free" {...invalid("price", errors.price)} />
        </Field>

        <Field id="category" label="Category" error={errors.category}>
          <select
            id="category"
            value={fields.category}
            onChange={(e) => set("category", e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
            {...invalid("category", errors.category)}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field id="description" label="Description" hint="Optional" error={errors.description}>
          <Textarea id="description" value={fields.description} onChange={(e) => set("description", e.target.value)} maxLength={MAX_DESCRIPTION} rows={4} placeholder="Condition, size, pickup details…" {...invalid("description", errors.description)} />
        </Field>

        <Field id="location" label="Location" hint={`Optional · defaults to ${DEFAULT_LOCATION}`} error={errors.location}>
          <Input id="location" value={fields.location} onChange={(e) => set("location", e.target.value)} maxLength={MAX_LOCATION} placeholder={DEFAULT_LOCATION} {...invalid("location", errors.location)} />
        </Field>

        <Field id="email" label="Your email" hint="Shown on the listing so buyers can reach you" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" value={fields.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" {...invalid("email", errors.email)} />
        </Field>

        {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}

        <Button type="submit" size="lg" disabled={submitting} className="h-10 font-semibold">
          {submitting && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
          {submitting ? "Publishing…" : "Publish"}
        </Button>
      </form>

      {/* Live preview, like Marketplace's create page. */}
      <section aria-label="Preview" className="hidden flex-1 flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm lg:flex">
        <h2 className="text-[17px] font-semibold">Preview</h2>
        <div className="grid grid-cols-[1.4fr_1fr] overflow-hidden rounded-lg border">
          <div className="flex aspect-[4/3] items-center justify-center bg-muted">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview
              <img src={preview} alt="" className="size-full object-contain" />
            ) : (
              <p className="px-6 text-center text-muted-foreground">Your listing preview. As you create your listing, you can preview how it will appear to others.</p>
            )}
          </div>
          <div className="flex flex-col gap-1 p-4">
            <p className={cn("text-xl font-bold break-words", !fields.title.trim() && "text-muted-foreground")}>{fields.title.trim() || "Title"}</p>
            <p className={cn("font-semibold", price === null && "text-muted-foreground")}>{price === null ? "Price" : formatPrice(price)}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" aria-hidden="true" />
              Listed just now in {fields.location.trim() || DEFAULT_LOCATION}
            </p>
            {fields.category && <p className="text-sm text-muted-foreground">{fields.category}</p>}
            <p className="mt-2 text-sm font-semibold">Details</p>
            <p className="line-clamp-6 text-sm break-words whitespace-pre-wrap text-muted-foreground">{fields.description.trim() || "Description will appear here."}</p>
            <p className="mt-2 text-sm font-semibold">Seller information</p>
            <p className="truncate text-sm text-muted-foreground">{fields.email.trim() || "you@example.com"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function invalid(id: string, error: string | undefined) {
  return { "aria-invalid": !!error, "aria-describedby": error ? `${id}-error` : undefined };
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="flex items-baseline justify-between gap-2">
        {label}
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
      {error && <p id={`${id}-error`} className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
