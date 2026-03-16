import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { formatPresets, stylePresets } from "@/services/ai/presets";

export const dynamic = "force-dynamic";

async function updateDefaultPresets(formData: FormData) {
  "use server";

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
