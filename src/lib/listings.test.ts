import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  canCheckout,
  formatCents,
  platformFeeCents,
  toCents,
  categoryFromSlug,
  categorySlug,
  formatPrice,
  isEmail,
  isUuid,
  parsePrice,
  searchTerm,
  timeAgo,
  validateListing,
  validateMessage,
  validatePhoto,
  type ListingInput,
} from "./listings";

const good: ListingInput = {
  title: "Trek mountain bike",
  description: "Barely used, new tires.",
  price: "250",
  category: "Sporting Goods",
  email: "seller@example.com",
  location: "",
  hasPhoto: true,
};

describe("categories", () => {
  it("has the 18 Marketplace categories", () => {
    expect(CATEGORIES).toHaveLength(18);
  });

  it("turns names into URL slugs and back", () => {
    expect(categorySlug("Garden & Outdoor")).toBe("garden-and-outdoor");
    expect(categorySlug("Toys & Games")).toBe("toys-and-games");
    for (const c of CATEGORIES) expect(categoryFromSlug(categorySlug(c))).toBe(c);
  });

  it("ignores unknown slugs", () => {
    expect(categoryFromSlug("weapons")).toBeNull();
    expect(categoryFromSlug(undefined)).toBeNull();
  });
});

describe("prices", () => {
  it("reads what sellers type", () => {
    expect(parsePrice("250")).toBe(250);
    expect(parsePrice("1,250.50")).toBe(1250.5);
    expect(parsePrice("$12.5")).toBe(12.5);
    expect(parsePrice("0")).toBe(0);
  });

  it("rejects prices that aren't prices", () => {
    for (const bad of ["", "-5", "abc", "12.345", "1e5", "100000000"]) expect(parsePrice(bad)).toBeNull();
  });

  it("formats like Marketplace", () => {
    expect(formatPrice(0)).toBe("Free");
    expect(formatPrice(1250)).toBe("$1,250");
    expect(formatPrice(12.5)).toBe("$12.50");
    expect(formatPrice("40.00")).toBe("$40");
  });
});

describe("validation", () => {
  it("accepts a complete listing", () => {
    expect(validateListing(good)).toEqual({});
  });

  it("names every missing field", () => {
    const errors = validateListing({ title: " ", description: "", price: "", category: "", email: "nope", location: "", hasPhoto: false });
    expect(Object.keys(errors).sort()).toEqual(["category", "email", "hasPhoto", "price", "title"]);
  });

  it("enforces the length limits", () => {
    expect(validateListing({ ...good, title: "x".repeat(101) }).title).toBeDefined();
    expect(validateListing({ ...good, description: "x".repeat(2001) }).description).toBeDefined();
    expect(validateListing({ ...good, location: "x".repeat(81) }).location).toBeDefined();
  });

  it("checks emails", () => {
    expect(isEmail("a@b.co")).toBe(true);
    expect(isEmail(" a@b.co ")).toBe(true);
    expect(isEmail("a@b")).toBe(false);
    expect(isEmail("a b@c.com")).toBe(false);
  });

  it("checks photos", () => {
    expect(validatePhoto({ type: "image/png", size: 1000 })).toBeNull();
    expect(validatePhoto({ type: "application/pdf", size: 1000 })).not.toBeNull();
    expect(validatePhoto({ type: "image/jpeg", size: 6 * 1024 * 1024 })).not.toBeNull();
  });

  it("checks messages to sellers", () => {
    expect(validateMessage({ buyerEmail: "buyer@example.com", message: "Is this still available?" })).toEqual({});
    expect(Object.keys(validateMessage({ buyerEmail: "", message: "   " }))).toEqual(["buyerEmail", "message"]);
    expect(validateMessage({ buyerEmail: "b@x.io", message: "x".repeat(1001) }).message).toBeDefined();
  });
});

describe("search", () => {
  it("keeps normal words", () => {
    expect(searchTerm("  mountain   bike ")).toBe("mountain bike");
    expect(searchTerm("Señor's desk-lamp")).toBe("Señor's desk-lamp");
  });

  it("removes filter syntax so a search can't change the query", () => {
    expect(searchTerm("bike,title.eq.x)")).toBe("bike title.eq.x");
    expect(searchTerm('%"*')).toBe("");
  });

  it("caps the length", () => {
    expect(searchTerm("a".repeat(100))).toHaveLength(60);
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-11-21T12:00:00Z");
  it("reads like Marketplace", () => {
    expect(timeAgo("2026-11-21T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-11-21T11:55:00Z", now)).toBe("5 minutes ago");
    expect(timeAgo("2026-11-21T09:00:00Z", now)).toBe("3 hours ago");
    expect(timeAgo("2026-11-20T10:00:00Z", now)).toBe("yesterday");
    expect(timeAgo("2026-11-18T12:00:00Z", now)).toBe("3 days ago");
    expect(timeAgo("2026-10-01T12:00:00Z", now)).toBe("Oct 1, 2026");
  });
});

describe("ids", () => {
  it("recognises listing ids", () => {
    expect(isUuid("3f1c2e7a-9b2d-4c1e-8f00-0a1b2c3d4e5f")).toBe(true);
    expect(isUuid("not-an-id")).toBe(false);
  });
});

describe("payments", () => {
  it("converts prices to cents without float errors", () => {
    expect(toCents(280)).toBe(28000);
    expect(toCents("19.99")).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it("keeps a 10% platform fee", () => {
    expect(platformFeeCents(28000)).toBe(2800);
    expect(platformFeeCents(1999)).toBe(200);
  });

  it("only sells items Stripe can charge for", () => {
    expect(canCheckout(0)).toBe(false);
    expect(canCheckout(0.49)).toBe(false);
    expect(canCheckout(0.5)).toBe(true);
    expect(canCheckout("45")).toBe(true);
  });

  it("formats amounts in cents", () => {
    expect(formatCents(28000)).toBe("$280.00");
    expect(formatCents(2800)).toBe("$28.00");
  });
});
