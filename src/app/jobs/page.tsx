import type { Draft, PostJob } from "@prisma/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cancelScheduleAction, sendDraftToTelegramAction } from "@/app/actions/dashboard";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function JobsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : undefined;
  const message = firstParam(params?.message);
  const tone = firstParam(params?.tone);

  const jobs: Array<
    PostJob & {
      draft: Draft;
    }
  > = await prisma.postJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { draft: true },
  });

  return (
    <section className="card">
      <h2>Jobs</h2>
      {message ? <div className={`notice ${tone === "error" ? "error" : "success"}`}>{message}</div> : null}
      {jobs.length === 0 ? (
        <div className="empty">No post jobs yet. Schedule a draft to queue publishing.</div>
      ) : (
        <div className="list">
          {jobs.map((job) => (
            <article className="item" key={job.id}>
              <header>
                <div>
                  <h3>{job.platform}</h3>
                  <p className="muted">Draft: {job.draft.content}</p>
                </div>
                <StatusBadge status={job.status} />
              </header>
              <p className="muted">Scheduled for {formatDateTime(job.scheduledFor)}</p>
              {job.failureReason ? <p className="muted">Detail: {job.failureReason}</p> : null}
              <div className="action-row">
                <form action={sendDraftToTelegramAction}>
                  <input name="draftId" type="hidden" value={job.draftId} />
                  <input name="redirectPath" type="hidden" value="/jobs" />
                  <button className="chip" type="submit">
                    Send draft to Telegram
                  </button>
                </form>
                {job.status === "PENDING" ? (
                  <form action={cancelScheduleAction}>
                    <input name="jobId" type="hidden" value={job.id} />
                    <input name="redirectPath" type="hidden" value="/jobs" />
                    <button className="chip danger" type="submit">
                      Cancel schedule
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
