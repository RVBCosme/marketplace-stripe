import type { Metadata } from "next";
import { CreateListingForm } from "@/components/create-listing-form";

export const metadata: Metadata = { title: "Create new listing" };

export default function CreatePage() {
  return <CreateListingForm />;
}
