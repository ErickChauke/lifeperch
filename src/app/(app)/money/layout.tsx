import { MoneySubnav } from "@/components/modules/money/money-subnav";

// Money module shell: the five-tab sub-nav above every Money screen. The
// breadcrumb stays "LifePerch / Money" for all of them (topbar reads the first
// path segment). The sub-nav is the pinned header zone; tab content scrolls
// beneath it on desktop.
export default function MoneyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:h-full md:min-h-0 md:overflow-hidden">
      <MoneySubnav />
      <div className="scrollbar-hide min-h-0 flex-1 px-5 pt-6 pb-8 md:overflow-y-auto md:px-8 md:pt-8 md:pb-10">
        {children}
      </div>
    </div>
  );
}
