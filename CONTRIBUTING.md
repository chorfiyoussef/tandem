# Contributing to Tandem

Thanks for helping. Tandem is small on purpose, so every change should keep it
calm and obvious to use.

## Before you start

- Open an issue for anything bigger than a bug fix so we can agree on the
  shape first. Small fixes can go straight to a pull request.
- Read `CLAUDE.md`: it is written for AI agents but it is also the shortest
  description of the codebase conventions.

## Setting up

You need Node 22+, pnpm 10 (`corepack enable`), Docker, and the
[Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
pnpm db:start      # local Supabase, applies supabase/migrations
pnpm dev           # web on http://localhost:3000, api on :4000
```

The first visit shows the setup screen; create an owner account there.

## Making changes

- `pnpm typecheck && pnpm lint` must pass. CI runs both plus a production build.
- Database changes go in a new file under `supabase/migrations`
  (`pnpm db:migration <name>`), never in an applied one. Regenerate types with
  `pnpm db:types` and commit them.
- Every table needs row-level security. Privileged work belongs in `apps/api`.
- UI: use the design tokens in `apps/web/src/app/globals.css` and the icon
  aliases in `apps/web/src/components/icons.tsx`. Two saturated colours only
  (action blue, destructive red); everything else is grey or a pastel token.
- Copy: sentence case, plain verbs, no marketing voice. Buttons say what
  they do ("Create workspace", not "Submit").

## Pull requests

- One topic per PR, with a short description of what changed and why.
- Include a screenshot or short recording for anything visual.
- Keep commit messages plain; no trailers are needed.

## Reporting bugs and ideas

Use the issue templates. For security problems, see `SECURITY.md` instead of
opening a public issue.
