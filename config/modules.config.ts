// Module registry. The sidebar renders a link for every enabled module.
// Set enabled: false to hide a module without deleting its data.
// icon is a lucide-react icon name, mapped to a component in the sidebar.
export type ModuleConfig = {
  id: string;
  label: string;
  href: string;
  icon: string;
  enabled: boolean;
};

export const modules: ModuleConfig[] = [
  {
    id: "timetable",
    label: "Timetable",
    href: "/timetable",
    icon: "calendar",
    enabled: true,
  },
];
