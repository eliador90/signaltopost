# Customization

SignalToPost is meant to be personal. The default profile is opinionated, but forks can change the voice without editing prompt code.

## Content Voice

Set the content profile environment variables:

```env
CONTENT_PROFILE_CONTEXT=You are writing for an independent product designer who builds calm workflow tools.
CONTENT_PROFILE_THEMES=Product design;Solo software;Customer research;Practical AI workflows
CONTENT_PROFILE_VOICE_RULES=Specific;Plainspoken;Useful;No performative certainty
CONTENT_PROFILE_AVOID_RULES=Growth hacks;Generic inspiration;Corporate jargon
```

The list variables accept newline or semicolon separated values. If all profile variables are empty, SignalToPost uses the built-in Zurich founder-operator / fractional CFO profile.

## Platform Guidance

Use:

- `CONTENT_PROFILE_X_GUIDANCE`
- `CONTENT_PROFILE_LINKEDIN_GUIDANCE`

These append extra platform guidance to the default style guides. They are useful for things like "never use threads" or "always include a short practical takeaway."

## Presets

Style and format presets live in `src/services/ai/presets.ts`.

Style presets shape the voice:

- `default`
- `builder_punchy`
- `calm_operator`
- `technical_explainer`
- `cfo_authority`

Format presets shape the structure:

- `standard`
- `two_sentence`
- `short_paragraphs`
- `bullet_points`

Preset IDs are stored in the database, so do not remove or rename an existing ID after real users have saved it. Add new IDs instead.

## Telegram Review Flow

Telegram keyboards are defined in `src/services/telegram/keyboards.ts`. The main generation flow is:

1. Capture idea.
2. Pick platform.
3. Pick style preset.
4. Pick format preset.
5. Optionally add one generation note.
6. Generate draft candidates.
7. Review, rewrite, schedule, or publish.

## GitHub Repositories

`GITHUB_REPOS` supports both short and full names:

```env
GITHUB_USERNAME=your-user
GITHUB_REPOS=personal-repo,another-repo
```

or:

```env
GITHUB_REPOS=your-user/personal-repo,your-org/company-repo
```

Use full `owner/repo` entries when you ingest repositories across multiple owners or organizations.

## Posting Behavior

X direct posting only runs when all required X credentials are configured. LinkedIn currently uses manual fallback so you can review and paste the final draft yourself.

The master automation switch and GitHub idea automation switch are available in `/settings` and Telegram commands. Keep automation off if you want a purely on-demand cockpit.
