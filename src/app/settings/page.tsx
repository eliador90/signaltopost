import { revalidatePath } from "next/cache";
import { env, getConfiguredGithubRepos } from "@/lib/env";
import { prisma } from "@/lib/db";
import { requireDashboardAuth } from "@/lib/dashboardAuth";
import { logger } from "@/lib/logger";
import { aiModelOptions, resolveAiModel } from "@/services/ai/models";
import { formatPresets, stylePresets } from "@/services/ai/presets";
import { syncConfiguredGithubWebhooks } from "@/services/github/webhooks";

export const dynamic = "force-dynamic";

async function updateDefaultPresets(formData: FormData) {
  "use server";

  await requireDashboardAuth();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      defaultXStylePreset: nullableValue(formData.get("defaultXStylePreset")),
      defaultXFormatPreset: nullableValue(formData.get("defaultXFormatPreset")),
      defaultLinkedInStylePreset: nullableValue(formData.get("defaultLinkedInStylePreset")),
      defaultLinkedInFormatPreset: nullableValue(formData.get("defaultLinkedInFormatPreset")),
    },
  });

  revalidatePath("/settings");
}

async function updateAiModel(formData: FormData) {
  "use server";

  await requireDashboardAuth();
  const userId = String(formData.get("userId") ?? "");
  const model = nullableValue(formData.get("openAiModel"));
  if (!userId) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      openAiModel: model,
    },
  });

  revalidatePath("/settings");
}

async function updateGithubIdeaAutomation(formData: FormData) {
  "use server";

  await requireDashboardAuth();
  const userId = String(formData.get("userId") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!userId) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      githubIdeaAutomationEnabled: enabled,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/");
}

async function updateBackgroundAutomation(formData: FormData) {
  "use server";

  await requireDashboardAuth();
  const userId = String(formData.get("userId") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!userId) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      automationEnabled: enabled,
    },
  } as never);

  const webhookSync = await syncConfiguredGithubWebhooks(enabled);
  if (webhookSync.errors.length > 0) {
    logger.warn("Background automation changed but GitHub webhook sync had errors", {
      enabled,
      errors: webhookSync.errors,
    });
  }

  revalidatePath("/settings");
  revalidatePath("/");
}

export default async function SettingsPage() {
  await requireDashboardAuth();
  const user = (await prisma.user.findFirst()) as
    | (Awaited<ReturnType<typeof prisma.user.findFirst>> & { automationEnabled?: boolean })
    | null;
  const githubRepos = getConfiguredGithubRepos();
  const setupItems = [
    setupItem("Database", env.DATABASE_URL, "Required"),
    setupItem("OpenAI API key", env.OPENAI_API_KEY, "Required for AI cleanup, drafts, rewrites, and summaries"),
    setupItem("Telegram bot token", env.TELEGRAM_BOT_TOKEN, "Required for Telegram workflow"),
    setupItem("Telegram webhook secret", env.TELEGRAM_WEBHOOK_SECRET, "Recommended for webhook verification"),
    setupItem("Allowed Telegram chat", env.TELEGRAM_ALLOWED_CHAT_ID, "Recommended for single-user safety"),
    setupItem("Dashboard secret", env.DASHBOARD_SECRET, "Required in production"),
    setupItem("Cron secret", env.CRON_SECRET, "Required for hosted cron routes"),
    {
      label: "GitHub repositories",
      configured: githubRepos.length > 0,
      note: githubRepos.length > 0 ? `${githubRepos.length} configured` : "Optional",
    },
    setupItem("GitHub token", env.GITHUB_TOKEN, "Optional for GitHub ingestion"),
    setupItem("GitHub webhook secret", env.GITHUB_WEBHOOK_SECRET, "Required if GitHub webhooks are enabled"),
    setupItem("X credentials", env.X_API_KEY && env.X_API_KEY_SECRET && env.X_ACCESS_TOKEN && env.X_ACCESS_TOKEN_SECRET, "Optional direct posting"),
    setupItem("LinkedIn access token", env.LINKEDIN_ACCESS_TOKEN, "Optional; manual fallback works without it"),
  ];

  return (
    <div className="grid">
      <section className="card">
        <h2>Setup checklist</h2>
        <p className="muted">
          Secret values are hidden here. This page only shows whether each integration appears configured.
        </p>
        <div className="list">
          {setupItems.map((item) => (
            <div className="item" key={item.label}>
              <header>
                <h3>{item.label}</h3>
                <span className={`status ${item.configured ? "status-approved" : "status-pending_review"}`}>
                  {item.configured ? "configured" : "missing"}
                </span>
              </header>
              <p className="muted">{item.note}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>Public endpoints</h2>
        <div className="list">
          <div className="item">
            <strong>Telegram webhook</strong>
            <p className="muted mono">/api/telegram</p>
          </div>
          <div className="item">
            <strong>GitHub webhook</strong>
            <p className="muted mono">/api/github/webhook</p>
          </div>
          <div className="item">
            <strong>Health check</strong>
            <p className="muted mono">/api/health</p>
          </div>
        </div>
      </section>
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
            <p className="muted mono">{user ? resolveAiModel(user.openAiModel) : env.OPENAI_MODEL}</p>
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
      <section className="card">
        <h2>Operating mode</h2>
        {!user ? (
          <p className="muted">No Telegram user exists yet. Send one bot message first, then come back here.</p>
        ) : (
          <div className="list">
            <div className="item">
              <strong>Master switch</strong>
              <p className="muted">
                SignalToPost is currently in{" "}
                <span className="mono">{user.automationEnabled ? "proactive" : "on-demand"}</span> mode.
              </p>
              <p className="muted">
                On-demand mode means nothing runs by itself: no morning digest, no automatic draft generation, and no
                GitHub webhook wakeups. Use Telegram when you explicitly want GitHub activity or a social post.
              </p>
              <p className="muted">
                Proactive mode allows background automation again. The GitHub idea automation setting below then decides
                whether GitHub activity should become ideas automatically.
              </p>
              <form action={updateBackgroundAutomation} className="action-row">
                <input name="userId" type="hidden" value={user.id} />
                <input name="enabled" type="hidden" value={user.automationEnabled ? "false" : "true"} />
                <button className="chip" type="submit">
                  {user.automationEnabled ? "Switch to on-demand" : "Switch to proactive"}
                </button>
              </form>
            </div>
          </div>
        )}
      </section>
      <section className="card">
        <h2>GitHub idea automation</h2>
        {!user ? (
          <p className="muted">No Telegram user exists yet. Send one bot message first, then come back here.</p>
        ) : (
          <div className="list">
            <div className="item">
              <strong>Proactive-mode sub-setting</strong>
              <p className="muted">
                Automatic GitHub idea generation is{" "}
                <span className="mono">
                  {user.automationEnabled
                    ? user.githubIdeaAutomationEnabled
                      ? "enabled"
                      : "disabled"
                    : "inactive in on-demand mode"}
                </span>
                .
              </p>
              <p className="muted">
                This setting does nothing while Operating mode is on-demand. When proactive mode is on, it controls
                whether incoming GitHub activity becomes queued content ideas automatically.
              </p>
              <p className="muted">
                In proactive mode, the system creates at most{" "}
                {env.GITHUB_MAX_IDEAS_PER_DAY} GitHub ideas per day and at most{" "}
                {env.GITHUB_MAX_IDEAS_PER_REPO_PER_DAY} per repository per day.
              </p>
              <form action={updateGithubIdeaAutomation} className="action-row">
                <input name="userId" type="hidden" value={user.id} />
                <input
                  name="enabled"
                  type="hidden"
                  value={user.githubIdeaAutomationEnabled ? "false" : "true"}
                />
                <button className="chip" type="submit">
                  {user.githubIdeaAutomationEnabled ? "Disable GitHub ideas" : "Enable GitHub ideas"}
                </button>
              </form>
            </div>
          </div>
        )}
      </section>
      <section className="card">
        <h2>Model</h2>
        {!user ? (
          <p className="muted">No Telegram user exists yet. Send one bot message first, then come back here.</p>
        ) : (
          <form action={updateAiModel} className="list">
            <input name="userId" type="hidden" value={user.id} />
            <label className="item">
              <strong>Generation model</strong>
              <p className="muted">
                This model is used for idea cleanup, GitHub summaries, draft generation, and rewrites. Leave it on the
                environment default to use <span className="mono">{env.OPENAI_MODEL}</span>.
              </p>
              <select defaultValue={user.openAiModel ?? ""} name="openAiModel">
                <option value="">Use environment default ({env.OPENAI_MODEL})</option>
                {aiModelOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </label>
            <button className="chip" type="submit">
              Save model
            </button>
          </form>
        )}
      </section>
      <section className="card">
        <h2>Default presets</h2>
        {!user ? (
          <p className="muted">No Telegram user exists yet. Send one bot message first, then come back here.</p>
        ) : (
          <form action={updateDefaultPresets} className="list">
            <input name="userId" type="hidden" value={user.id} />
            <PresetSelect
              label="X style"
              name="defaultXStylePreset"
              value={user.defaultXStylePreset}
              options={stylePresets}
            />
            <PresetSelect
              label="X format"
              name="defaultXFormatPreset"
              value={user.defaultXFormatPreset}
              options={formatPresets}
            />
            <PresetSelect
              label="LinkedIn style"
              name="defaultLinkedInStylePreset"
              value={user.defaultLinkedInStylePreset}
              options={stylePresets}
            />
            <PresetSelect
              label="LinkedIn format"
              name="defaultLinkedInFormatPreset"
              value={user.defaultLinkedInFormatPreset}
              options={formatPresets}
            />
            <button className="chip" type="submit">
              Save defaults
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function PresetSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string | null;
  options: Array<{ id: string; label: string; description: string }>;
}) {
  return (
    <label className="item">
      <strong>{label}</strong>
      <select defaultValue={value ?? ""} name={name}>
        <option value="">Use implicit default</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label} - {option.description}
          </option>
        ))}
      </select>
    </label>
  );
}

function nullableValue(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? "").trim();
  return stringValue || null;
}

function setupItem(label: string, value: unknown, note: string) {
  return {
    label,
    configured: Boolean(typeof value === "string" ? value.trim() : value),
    note,
  };
}
