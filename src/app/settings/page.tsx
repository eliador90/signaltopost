import { env } from "@/lib/env";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await prisma.user.findFirst();

  return (
    <div className="grid">
      <section className="card">
        <h2>Environment</h2>
        <div className="list">
          <div className="item">
            <strong>APP_URL</strong>
            <p className="muted mono">{env.APP_URL}</p>
          </div>
          <div className="item">
            <strong>TIMEZONE</strong>
            <p className="muted mono">{env.TIMEZONE}</p>
          </div>
          <div className="item">
            <strong>OpenAI model</strong>
            <p className="muted mono">{env.OPENAI_MODEL}</p>
          </div>
        </div>
      </section>
      <section className="card">
        <h2>Single-user bot guardrail</h2>
        <p className="muted">
          Allowed chat ID: <span className="mono">{env.TELEGRAM_ALLOWED_CHAT_ID ?? "not configured"}</span>
        </p>
        <p className="muted">
          Current stored user: <span className="mono">{user?.telegramChatId ?? "none"}</span>
        </p>
      </section>
    </div>
  );
}
