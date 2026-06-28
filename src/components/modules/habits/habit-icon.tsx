import {
  CircleCheck,
  Droplet,
  BookOpen,
  Dumbbell,
  PenLine,
  Heart,
  Moon,
  Sun,
  Coffee,
  Apple,
  Footprints,
  Brain,
  Music,
  Leaf,
  Bike,
  Code,
  Sparkles,
  AlarmClock,
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
  heart: Heart,
  moon: Moon,
  sun: Sun,
  coffee: Coffee,
  apple: Apple,
  footprints: Footprints,
  brain: Brain,
  music: Music,
  leaf: Leaf,
  bike: Bike,
  code: Code,
  sparkles: Sparkles,
  "alarm-clock": AlarmClock,
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
