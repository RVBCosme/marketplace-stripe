"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isEmail } from "@/lib/listings";

export function ConnectStripeForm({ defaultEmail = "", label = "Connect with Stripe" }: { defaultEmail?: string; label?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function connect(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!isEmail(email)) {
      setError("Enter the email you use on your listings.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/stripe/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.url) {
      setError(data?.error ?? "Couldn't reach Stripe. Please try again.");
      setBusy(false);
      return;
    }
    window.location.href = data.url; // Stripe-hosted onboarding
  }

  return (
    <form onSubmit={connect} noValidate className="flex flex-col gap-3" aria-label="Connect with Stripe">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="seller-email">Seller email</Label>
        <Input
          id="seller-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="the email on your listings"
          aria-invalid={!!error}
          aria-describedby={error ? "seller-email-error" : undefined}
          className="h-10 text-[15px]"
        />
        {error && <p id="seller-email-error" className="text-sm text-destructive">{error}</p>}
      </div>
      <Button type="submit" size="lg" disabled={busy} className="h-10 bg-[#635bff] font-semibold hover:bg-[#635bff]/90">
        {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
        {busy ? "Opening Stripe…" : label}
      </Button>
    </form>
  );
}
