// Module registry. The sidebar renders a link for every enabled module,
// grouped by section. Set enabled: false to hide a module without deleting its data.
// icon is a lucide-react icon name, mapped to a component in nav-links.
export type ModuleGroup = "Daily" | "Records" | "Archive";

export type ModuleConfig = {
  id: string;
  label: string;
  href: string;
  icon: string;
  group: ModuleGroup;
  enabled: boolean;
};

// Section order in the sidebar.
export const GROUP_ORDER: ModuleGroup[] = ["Daily", "Records", "Archive"];

export const modules: ModuleConfig[] = [
  // Daily
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard", group: "Daily", enabled: true },
  { id: "timetable", label: "Timetable", href: "/timetable", icon: "calendar", group: "Daily", enabled: true },
  { id: "habits", label: "Habits", href: "/habits", icon: "habits", group: "Daily", enabled: false },
  { id: "journal", label: "Journal", href: "/journal", icon: "journal", group: "Daily", enabled: true },
  // Records
  { id: "notes", label: "Notes", href: "/notes", icon: "notes", group: "Records", enabled: true },
  { id: "money", label: "Money", href: "/money", icon: "money", group: "Records", enabled: true },
  { id: "health", label: "Health", href: "/health", icon: "health", group: "Records", enabled: false },
  { id: "literature", label: "Literature", href: "/literature", icon: "literature", group: "Records", enabled: true },
  { id: "jobs", label: "Jobs", href: "/jobs", icon: "jobs", group: "Records", enabled: false },
  // Archive
  { id: "vault", label: "Vault", href: "/vault", icon: "vault", group: "Archive", enabled: true },
  { id: "timeline", label: "Timeline", href: "/timeline", icon: "timeline", group: "Archive", enabled: false },
];
