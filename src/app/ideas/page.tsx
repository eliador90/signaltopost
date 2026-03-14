import type { Idea, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const ideas: Array<
    Idea & {
      user: User;
    }
  > = await prisma.idea.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: true },
  });

  return (
    <section className="card">
      <h2>Ideas</h2>
      <div className="list">
        {ideas.length === 0 ? (
          <div className="empty">No ideas stored yet.</div>
        ) : (
          ideas.map((idea) => (
            <article className="item" key={idea.id}>
              <header>
                <div>
                  <h3>{idea.normalizedContent ?? idea.rawContent}</h3>
                  <p className="muted">
                    {idea.source} · {idea.user.name ?? idea.user.telegramChatId}
                  </p>
                </div>
                <StatusBadge status={idea.status} />
              </header>
              {idea.normalizedContent && idea.normalizedContent !== idea.rawContent ? (
                <p className="muted">Raw: {idea.rawContent}</p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
