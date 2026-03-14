import type { Draft, Idea } from "@prisma/client";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const drafts: Array<
    Draft & {
      sourceIdea: Idea | null;
    }
  > = await prisma.draft.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { sourceIdea: true },
  });

  return (
    <section className="card">
      <h2>Drafts</h2>
      <div className="list">
        {drafts.length === 0 ? (
          <div className="empty">No drafts yet.</div>
        ) : (
          drafts.map((draft) => (
            <article className="item" key={draft.id}>
              <header>
                <div>
                  <h3>{draft.platform}</h3>
                  <p className="muted">
                    Source: {draft.sourceIdea?.normalizedContent ?? draft.sourceIdea?.rawContent ?? "n/a"}
                  </p>
                </div>
                <StatusBadge status={draft.status} />
              </header>
              <p>{draft.content}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
