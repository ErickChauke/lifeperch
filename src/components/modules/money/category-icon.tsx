import {
  ShoppingCart,
  House,
  Car,
  Utensils,
  Plug,
  HeartPulse,
  Clapperboard,
  ShoppingBag,
  TrendingUp,
  CircleDashed,
  Wallet,
  Laptop,
  Gift,
  RotateCcw,
  Wifi,
  GraduationCap,
  Briefcase,
  Baby,
  PawPrint,
  Plane,
  CreditCard,
  PiggyBank,
  Umbrella,
  Landmark,
  Banknote,
  Wrench,
  Repeat,
  type LucideIcon,
} from "lucide-react";
import { categoryIcon } from "@/lib/money";

// Maps the icon names stored in the category presets to lucide components.
const ICONS: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart,
  house: House,
  car: Car,
  utensils: Utensils,
  plug: Plug,
  "heart-pulse": HeartPulse,
  clapperboard: Clapperboard,
  "shopping-bag": ShoppingBag,
  "trending-up": TrendingUp,
  "circle-dashed": CircleDashed,
  wallet: Wallet,
  laptop: Laptop,
  gift: Gift,
  "rotate-ccw": RotateCcw,
  wifi: Wifi,
  "graduation-cap": GraduationCap,
  briefcase: Briefcase,
  baby: Baby,
  "paw-print": PawPrint,
  plane: Plane,
  "credit-card": CreditCard,
  "piggy-bank": PiggyBank,
  umbrella: Umbrella,
  landmark: Landmark,
  banknote: Banknote,
  wrench: Wrench,
  repeat: Repeat,
};

// Renders the lucide icon for a transaction/shopping category.
export function CategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = ICONS[categoryIcon(category)] ?? CircleDashed;
  return <Icon className={className} strokeWidth={1.75} />;
}
