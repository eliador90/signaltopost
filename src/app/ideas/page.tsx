import type { Idea, User } from "@prisma/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  archiveIdeaAction,
  generateDraftsForIdeaAction,
  sendIdeaToTelegramAction,
} from "@/app/actions/dashboard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function IdeasPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : undefined;
  const message = firstParam(params?.message);
  const tone = firstParam(params?.tone);

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
      {message ? <div className={`notice ${tone === "error" ? "error" : "success"}`}>{message}</div> : null}
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
                    {idea.source} | {idea.user.name ?? idea.user.telegramChatId}
                  </p>
                </div>
                <StatusBadge status={idea.status} />
              </header>
              {idea.normalizedContent && idea.normalizedContent !== idea.rawContent ? (
                <p className="muted">Raw: {idea.rawContent}</p>
              ) : null}
              <div className="action-row">
                {idea.status === "NEW" ? (
                  <>
                    <form action={generateDraftsForIdeaAction}>
                      <input name="ideaId" type="hidden" value={idea.id} />
                      <input name="redirectPath" type="hidden" value="/ideas" />
                      <button className="chip" type="submit">
                        Generate drafts
                      </button>
                    </form>
                    <form action={sendIdeaToTelegramAction}>
                      <input name="ideaId" type="hidden" value={idea.id} />
                      <input name="redirectPath" type="hidden" value="/ideas" />
                      <button className="chip" type="submit">
                        Send to Telegram
                      </button>
                    </form>
                  </>
                ) : null}
                {idea.status !== "ARCHIVED" ? (
                  <form action={archiveIdeaAction}>
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <input name="redirectPath" type="hidden" value="/ideas" />
                    <button className="chip danger" type="submit">
                      Archive
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
