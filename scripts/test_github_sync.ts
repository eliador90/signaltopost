import { runGithubSyncJob } from "../src/jobs/syncGithub";
import { prisma } from "../src/lib/db";

async function main() {
  const result = await runGithubSyncJob();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
