import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weekplanner",
  description: "Weekly task planner",
  icons: {
    icon: "/weekplanner/favicon.svg",
  },
};

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
