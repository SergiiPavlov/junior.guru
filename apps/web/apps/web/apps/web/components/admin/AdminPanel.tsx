"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";

type AdminStats = Record<string, unknown> | null;

type AdminPanelProps = {
  token: string;
  stats: AdminStats;
};

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return response;
}

export function AdminPanel({ token, stats }: AdminPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const adminToken = (formData.get("token") ?? "").toString().trim();
    if (!adminToken) {
      setMessage("Введіть токен");
      return;
    }

    startTransition(() => {
      postJson("/api/admin/login", { token: adminToken })
        .then((response) => {
          if (!response.ok) {
            setMessage("Не вдалося зберегти токен");
            return;
          }
          window.location.reload();
        })
        .catch(() => {
          setMessage("Сталася помилка. Спробуйте ще раз");
        });
    });
  };

  const runReindex = (type: "jobs" | "events") => {
    startTransition(() => {
      postJson("/api/admin/reindex", { type })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          setMessage(
            `Переіндексація ${type === "jobs" ? "вакансій" : "подій"}: ${response.status} ${
              data?.status ?? ""
            }`
          );
        })
        .catch(() => setMessage("Сталася помилка під час переіндексації"));
    });
  };

  return (
    <div className="space-y-6">
      {!token && (
        <form className="space-y-3" onSubmit={handleLogin}>
          <div>
            <label htmlFor="token" className="block text-sm font-medium">
              Admin token
            </label>
            <input
              id="token"
              name="token"
              type="password"
              className="mt-1 w-full rounded border px-3 py-2"
              disabled={isPending}
            />
          </div>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            disabled={isPending}
          >
            Зберегти
          </button>
        </form>
      )}

      {token && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              onClick={() => runReindex("jobs")}
              disabled={isPending}
            >
              Переіндексувати вакансії
            </button>
            <button
              type="button"
              className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
              onClick={() => runReindex("events")}
              disabled={isPending}
            >
              Переіндексувати події
            </button>
          </div>

          <div className="rounded border p-3">
            <h2 className="mb-2 font-medium">Індекси</h2>
            <pre className="overflow-auto rounded bg-gray-50 p-2 text-sm">
              {JSON.stringify(stats ?? { error: "No data" }, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
}
