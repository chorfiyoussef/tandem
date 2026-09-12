# Contributing to Tandem

Thanks for helping. Tandem is small on purpose, so every change should keep it
calm and obvious to use.

## Before you start

- Open an issue for anything bigger than a bug fix so we can agree on the
  shape first. Small fixes can go straight to a pull request.
- The "Conventions" and "Gotchas" sections below are the shortest description
  of how the codebase works. They're written so an AI coding agent can follow
  them too; feel free to hand this file to yours.

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

## Gotchas

- All data access from the browser goes through supabase-js with RLS. Only
  the Hono API (`apps/api`) uses the service role, and only for setup,
  invites and reminders. Add privileged operations there, not in Next.js
  route handlers.
- Query hooks live in `apps/web/src/lib/queries/*`; task mutations do
  optimistic updates through `patchTaskEverywhere`. Realtime invalidation is
  in `apps/web/src/lib/realtime.ts`.
- Task rows and cards fetch with `TASK_SELECT` (`apps/web/src/lib/types.ts`).
  If you add a relation, extend that string and the `TaskRow` type together.
- PostgREST embeds must be disambiguated when a table has two foreign keys to
  the same target (e.g. `profiles!task_assignees_user_id_fkey`), otherwise it
  answers 300.
- Icons come from `apps/web/src/components/icons.tsx` (Phosphor, aliased
  under stable names). No star or sparkle glyphs; pins mark favourites.
- Shadcn components live in `apps/web/src/components/ui` (radix-nova preset).
  Add more with `pnpm dlx shadcn@latest add <name>` from `apps/web`.
- Next.js 16: `proxy.ts` instead of middleware, async `params`, docs bundled
  in `apps/web/node_modules/next/dist/docs/`.
- Don't wrap pages that use `useSearchParams` in `<Suspense>`: the routes are
  dynamic, and the boundary caused hydration mismatches when react-query data
  arrived between hydration passes.
- Cloudflare: `keep_names` is off in `wrangler.jsonc` because esbuild's helper
  leaked into Next's inline scripts (`__name is not defined`).

## Pull requests

- One topic per PR, with a short description of what changed and why.
- Include a screenshot or short recording for anything visual.
- Keep commit messages plain; no trailers are needed.

## Reporting bugs and ideas

Use the issue templates. For security problems, see `SECURITY.md` instead of
opening a public issue.
