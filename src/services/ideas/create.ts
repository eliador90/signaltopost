import { IdeaSource, type User } from "@prisma/client";
import { prisma } from "@/lib/db";

type CreateIdeaInput = {
  user: Pick<User, "id">;
  rawContent: string;
  normalizedContent?: string | null;
  source?: IdeaSource;
};

export async function createIdea({
  user,
  rawContent,
  normalizedContent,
  source = IdeaSource.TELEGRAM,
}: CreateIdeaInput) {
  return prisma.idea.create({
    data: {
      userId: user.id,
      rawContent,
      normalizedContent: normalizedContent ?? null,
      source,
      status: "NEW",
    },
  });
}
