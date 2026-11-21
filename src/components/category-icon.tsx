import {
  Baby,
  Building2,
  Car,
  Clapperboard,
  Dumbbell,
  Gift,
  Guitar,
  Hammer,
  House,
  Newspaper,
  Palette,
  Paperclip,
  PawPrint,
  Puzzle,
  Shirt,
  Smartphone,
  Sofa,
  Trees,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/listings";

const ICONS: Record<Category, LucideIcon> = {
  Vehicles: Car,
  "Property Rentals": Building2,
  Apparel: Shirt,
  Classifieds: Newspaper,
  Electronics: Smartphone,
  Entertainment: Clapperboard,
  Family: Baby,
  "Free Stuff": Gift,
  "Garden & Outdoor": Trees,
  Hobbies: Palette,
  "Home Goods": Sofa,
  "Home Improvement": Hammer,
  "Home Sales": House,
  "Musical Instruments": Guitar,
  "Office Supplies": Paperclip,
  "Pet Supplies": PawPrint,
  "Sporting Goods": Dumbbell,
  "Toys & Games": Puzzle,
};

export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = ICONS[category];
  return <Icon className={className} aria-hidden="true" />;
}
