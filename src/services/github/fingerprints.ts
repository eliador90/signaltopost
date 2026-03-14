export function fingerprintGithubEvent(input: string) {
  return Buffer.from(input).toString("base64");
}
