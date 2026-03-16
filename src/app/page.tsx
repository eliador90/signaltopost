import type { Draft, Idea } from "@prisma/client";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

async function getOverview() {
  const [ideaCount, pendingDrafts, approvedDrafts, recentDrafts, approvedDraftsForSignals, feedbackEvents] = await Promise.all([
    prisma.idea.count(),
    prisma.draft.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.draft.count({ where: { status: "APPROVED" } }),
    prisma.draft.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { sourceIdea: true },
    }),
    prisma.draft.findMany({
      where: {
        status: "APPROVED",
      },
      select: {
        stylePreset: true,
        formatPreset: true,
      },
      take: 50,
    }),
    prisma.feedbackEvent.findMany({
      select: {
        action: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    }),
  ]);

  return {
    ideaCount,
    pendingDrafts,
    approvedDrafts,
    recentDrafts,
    topApprovedPreset: summarizePresetUsage(approvedDraftsForSignals),
    rewritePatterns: summarizeFeedbackActions(feedbackEvents),
  };
}

type Overview = {
  ideaCount: number;
  pendingDrafts: number;
  approvedDrafts: number;
  recentDrafts: Array<
    Draft & {
      sourceIdea: Idea | null;
    }
  >;
  topApprovedPreset: { stylePreset: string; formatPreset: string } | null;
  rewritePatterns: string[];
};

export default async function HomePage() {
  const overview: Overview = await getOverview();

  return (
    <>
      <section className="grid">
        <article className="card">
          <p className="muted">Stored ideas</p>
          <div className="metric">{overview.ideaCount}</div>
        </article>
        <article className="card">
          <p className="muted">Pending review</p>
          <div className="metric">{overview.pendingDrafts}</div>
        </article>
        <article className="card">
          <p className="muted">Approved drafts</p>
          <div className="metric">{overview.approvedDrafts}</div>
        </article>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Workflow</h2>
          <div className="pill-row">
            <span className="pill">Telegram webhook</span>
            <span className="pill">Idea capture</span>
            <span className="pill">OpenAI drafts</span>
            <span className="pill">Approve / reject</span>
            <span className="pill">GitHub sync</span>
            <span className="pill">Publishing</span>
          </div>
          <p className="muted">
            The current build covers the Telegram review loop, GitHub ingestion,
            preset-based draft generation, and live publishing validation.
          </p>
          <div className="list">
            <div className="item">
              <strong>Most approved preset</strong>
              <p className="muted">
                {overview.topApprovedPreset
                  ? `${overview.topApprovedPreset.stylePreset} / ${overview.topApprovedPreset.formatPreset}`
                  : "No approved preset data yet."}
              </p>
            </div>
            <div className="item">
              <strong>Common feedback actions</strong>
              <p className="muted">
                {overview.rewritePatterns.length > 0 ? overview.rewritePatterns.join(", ") : "No feedback pattern yet."}
              </p>
            </div>
          </div>
        </article>
        <article className="card">
          <h2>Recent drafts</h2>
          <div className="list">
            {overview.recentDrafts.length === 0 ? (
              <div className="empty">No drafts yet. Send an idea to Telegram first.</div>
            ) : (
              overview.recentDrafts.map((draft) => (
                <article className="item" key={draft.id}>
                  <header>
                    <div>
                      <h3>{draft.platform === "X" ? "X Draft" : "LinkedIn Draft"}</h3>
                      <p className="muted">
                        From idea: {draft.sourceIdea?.normalizedContent ?? draft.sourceIdea?.rawContent ?? "n/a"}
                      </p>
                    </div>
                    <StatusBadge status={draft.status} />
                  </header>
                  <p>{draft.content}</p>
                </article>
              ))
            )}
          </div>
        </article>
      </section>
    </>
  );
}

function summarizePresetUsage(drafts: Array<{ stylePreset: string | null; formatPreset: string | null }>) {
  const counts = new Map<string, number>();

  for (const draft of drafts) {
    const key = `${draft.stylePreset ?? "default"}|${draft.formatPreset ?? "standard"}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top) {
    return null;
  }

  const [stylePreset, formatPreset] = top[0].split("|");
  return { stylePreset, formatPreset };
}

function summarizeFeedbackActions(events: Array<{ action: string }>) {
  const counts = new Map<string, number>();

  for (const event of events) {
    counts.set(event.action, (counts.get(event.action) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([action]) => action.toLowerCase());
}
