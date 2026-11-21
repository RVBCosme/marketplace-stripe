"use client";

import { useState } from "react";
import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MESSAGE, validateMessage } from "@/lib/listings";
import { supabase } from "@/lib/supabase";

const DEFAULT_MESSAGE = "Hi, is this still available?";

export function MessageSeller({ listingId }: { listingId: string }) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [errors, setErrors] = useState<{ buyerEmail?: string; message?: string }>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  async function send(e: { preventDefault(): void }) {
    e.preventDefault();
    const problems = validateMessage({ buyerEmail, message });
    setErrors(problems);
    if (Object.keys(problems).length) return;

    setStatus("sending");
    setServerError(null);
    // The database fills in the seller's email from the listing.
    const { error } = await supabase
      .from("messages")
      .insert({ listing_id: listingId, buyer_email: buyerEmail.trim(), message: message.trim() });
    if (error) {
      setStatus("idle");
      setServerError("Your message wasn't sent. Please try again.");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-4" role="status">
        <p className="flex items-center gap-2 font-semibold text-green-800">
          <CircleCheck className="size-5" aria-hidden="true" />
          Message sent to the seller
        </p>
        <p className="text-sm text-green-900">They can reply to you at {buyerEmail.trim().toLowerCase()}.</p>
        <Button
          type="button"
          variant="link"
          className="h-auto px-0 text-primary"
          onClick={() => {
            setMessage("");
            setStatus("idle");
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={send} noValidate className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm" aria-label="Message Seller">
      <h2 className="flex items-center gap-2 text-[17px] font-semibold">
        <Send className="size-4 text-primary" aria-hidden="true" />
        Message Seller
      </h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MAX_MESSAGE}
          rows={3}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "message-error" : undefined}
          className="bg-muted text-[15px]"
        />
        {errors.message && <p id="message-error" className="text-sm text-destructive">{errors.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="buyer-email">Your email</Label>
        <Input
          id="buyer-email"
          type="email"
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={!!errors.buyerEmail}
          aria-describedby={errors.buyerEmail ? "buyer-email-error" : undefined}
          className="h-10 text-[15px]"
        />
        {errors.buyerEmail && <p id="buyer-email-error" className="text-sm text-destructive">{errors.buyerEmail}</p>}
      </div>
      {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" size="lg" disabled={status === "sending"} className="h-10 font-semibold">
        {status === "sending" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
        {status === "sending" ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
