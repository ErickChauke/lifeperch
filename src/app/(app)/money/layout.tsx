import { MoneySubnav } from "@/components/modules/money/money-subnav";

// Money module shell: the five-tab sub-nav above every Money screen. The
// breadcrumb stays "LifePerch / Money" for all of them (topbar reads the first
// path segment).
export default function MoneyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <MoneySubnav />
      {children}
    </div>
  );
}
