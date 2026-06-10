import {
  CircleCheck,
  Droplet,
  BookOpen,
  Dumbbell,
  PenLine,
  Circle,
  type LucideIcon,
} from "lucide-react";

// Maps the icon name stored on a habit to a lucide component. Icons are a label
// aid on the card, never a status.
const ICONS: Record<string, LucideIcon> = {
  "check-circle": CircleCheck,
  droplet: Droplet,
  "book-open": BookOpen,
  dumbbell: Dumbbell,
  "pen-line": PenLine,
};

export function HabitIcon({
  name,
  className,
}: {
  name: string | null;
  className?: string;
}) {
  const Icon = (name && ICONS[name]) || Circle;
  return <Icon className={className} strokeWidth={1.75} />;
}
