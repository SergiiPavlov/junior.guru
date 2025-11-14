import { cookies } from "next/headers";

import { AdminPanel } from "../../../components/admin/AdminPanel";
import { buildApiUrl } from "../../../lib/api";

type AdminStats = Record<string, unknown> | null;

async function fetchStats(token: string): Promise<AdminStats> {
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers["x-admin-token"] = token;
    }
    const response = await fetch(buildApiUrl("admin/stats"), {
      headers,
      cache: "no-store"
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as AdminStats;
  } catch {
    return null;
  }
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin-token")?.value ?? "";
  const stats = await fetchStats(token);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <AdminPanel token={token} stats={stats} />
    </div>
  );
}
