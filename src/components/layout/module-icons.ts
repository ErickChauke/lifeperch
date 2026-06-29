import {
  LayoutDashboard,
  Calendar,
  Repeat,
  BookText,
  ListTodo,
  FileText,
  Wallet,
  Activity,
  BookOpen,
  Briefcase,
  Lock,
  GitBranch,
  type LucideIcon,
} from "lucide-react";

// Maps the icon name stored in modules.config to a lucide component.
export const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  calendar: Calendar,
  habits: Repeat,
  journal: BookText,
  todo: ListTodo,
  notes: FileText,
  money: Wallet,
  health: Activity,
  literature: BookOpen,
  jobs: Briefcase,
  vault: Lock,
  timeline: GitBranch,
};

// Returns the lucide icon for a module icon name, falling back to Calendar.
export function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Calendar;
}
