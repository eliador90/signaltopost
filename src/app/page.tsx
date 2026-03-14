import type { Draft, Idea } from "@prisma/client";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

async function getOverview() {
  const [ideaCount, pendingDrafts, approvedDrafts, recentDrafts] = await Promise.all([
    prisma.idea.count(),
    prisma.draft.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.draft.count({ where: { status: "APPROVED" } }),
    prisma.draft.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { sourceIdea: true },
    }),
  ]);

  return { ideaCount, pendingDrafts, approvedDrafts, recentDrafts };
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
          <h2>Phase 1</h2>
          <div className="pill-row">
            <span className="pill">Telegram webhook</span>
            <span className="pill">Idea capture</span>
            <span className="pill">OpenAI drafts</span>
            <span className="pill">Approve / reject</span>
          </div>
          <p className="muted">
            This first build focuses on the end-to-end review loop before GitHub
            ingestion, scheduling, and publishing adapters.
          </p>
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
