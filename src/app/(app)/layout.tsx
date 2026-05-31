import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <AppShell
      userName={user.display_name ?? user.email ?? "Huisgenoot"}
      role={user.role}
    >
      {children}
    </AppShell>
  );
}
