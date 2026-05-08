export class DraftGenerationError extends Error {
  constructor(message = "Draft generation failed") {
    super(message);
    this.name = "DraftGenerationError";
  }
}
