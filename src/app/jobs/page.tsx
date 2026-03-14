import type { Draft, PostJob } from "@prisma/client";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
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
      {jobs.length === 0 ? (
        <div className="empty">No post jobs yet. Scheduling arrives in Phase 3.</div>
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
              {job.failureReason ? <p className="muted">Failure: {job.failureReason}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
