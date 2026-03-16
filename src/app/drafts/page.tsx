import type { Draft, Idea } from "@prisma/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  approveDraftAction,
  postDraftNowAction,
  rejectDraftAction,
  scheduleDraftAction,
  sendDraftToTelegramAction,
} from "@/app/actions/dashboard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DraftsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : undefined;
  const message = firstParam(params?.message);
  const tone = firstParam(params?.tone);

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
      {message ? <div className={`notice ${tone === "error" ? "error" : "success"}`}>{message}</div> : null}
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
                  <p className="muted">
                    Style: {draft.stylePreset ?? "default"} | Format: {draft.formatPreset ?? "standard"}
                  </p>
                  {draft.generationNote ? <p className="muted">Note: {draft.generationNote}</p> : null}
                  <p className="muted">Quality score: {draft.qualityScore?.toFixed(2) ?? "n/a"}</p>
                </div>
                <StatusBadge status={draft.status} />
              </header>
              <p>{draft.content}</p>
              <div className="action-row">
                {draft.status !== "APPROVED" && draft.status !== "POSTED" ? (
                  <form action={approveDraftAction}>
                    <input name="draftId" type="hidden" value={draft.id} />
                    <input name="redirectPath" type="hidden" value="/drafts" />
                    <button className="chip" type="submit">
                      Approve
                    </button>
                  </form>
                ) : null}
                {draft.status !== "REJECTED" && draft.status !== "POSTED" ? (
                  <form action={rejectDraftAction}>
                    <input name="draftId" type="hidden" value={draft.id} />
                    <input name="redirectPath" type="hidden" value="/drafts" />
                    <button className="chip danger" type="submit">
                      Reject
                    </button>
                  </form>
                ) : null}
                {draft.status !== "POSTED" ? (
                  <form action={postDraftNowAction}>
                    <input name="draftId" type="hidden" value={draft.id} />
                    <input name="redirectPath" type="hidden" value="/drafts" />
                    <button className="chip" type="submit">
                      Post now
                    </button>
                  </form>
                ) : null}
                <form action={sendDraftToTelegramAction}>
                  <input name="draftId" type="hidden" value={draft.id} />
                  <input name="redirectPath" type="hidden" value="/drafts" />
                  <button className="chip" type="submit">
                    Send to Telegram
                  </button>
                </form>
                {draft.status !== "POSTED" ? (
                  <form action={scheduleDraftAction}>
                    <input name="draftId" type="hidden" value={draft.id} />
                    <input name="redirectPath" type="hidden" value="/drafts" />
                    <input aria-label="Schedule draft" name="scheduledFor" type="datetime-local" />
                    <button className="chip" type="submit">
                      Schedule
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
