import { createHash } from "node:crypto";

export function fingerprintGithubEvent(input: string) {
  return createHash("sha256").update(input).digest("hex");
}
