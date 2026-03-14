import { prisma } from "../src/lib/db";

async function main() {
  const user = await prisma.user.upsert({
    where: { telegramChatId: "seed-user" },
    update: {},
    create: {
      telegramChatId: "seed-user",
      name: "Seed User",
      timezone: "Europe/Zurich",
    },
  });

  const idea = await prisma.idea.create({
    data: {
      userId: user.id,
      source: "MANUAL",
      rawContent: "Spent the day simplifying a Telegram-first content workflow for builders.",
      normalizedContent: "Built a simpler Telegram-first workflow for capturing ideas and reviewing drafts.",
      status: "PROCESSED",
      processedAt: new Date(),
    },
  });

  await prisma.draft.createMany({
    data: [
      {
        userId: user.id,
        sourceIdeaId: idea.id,
        platform: "X",
        status: "PENDING_REVIEW",
        content:
          "Building in public gets much easier when the capture step is almost frictionless.\n\nThat is why I am biasing toward Telegram first.",
        qualityScore: 0.82,
      },
      {
        userId: user.id,
        sourceIdeaId: idea.id,
        platform: "LINKEDIN",
        status: "PENDING_REVIEW",
        content:
          "I keep coming back to the same product principle: reduce friction at the exact point where people usually stop.\n\nFor this project, that means capturing ideas in Telegram and turning them into review-ready drafts with almost no extra work.",
        qualityScore: 0.86,
      },
    ],
  });
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
