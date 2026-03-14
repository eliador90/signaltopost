export function isCommand(text: string) {
  return text.trim().startsWith("/");
}

export function parseCommand(text: string) {
  const [command, ...rest] = text.trim().split(/\s+/);
  return {
    command: command.toLowerCase(),
    args: rest.join(" ").trim(),
  };
}
