# personal-finance

Private Nuxt 3 SPA for expense tracking. Split from `landing-hosting` so the public site does not share an origin or auth client with this dashboard.

## Routes

- `/login` — sign in
- `/` — dashboard
- `/expenses` — expense list and edits

All routes except `/login` require an allowlisted session. Env: `SUPABASE_URL`, `SUPABASE_KEY`, `ALLOWED_EMAILS`. Apply `supabase/rls-finance.sql` in the Supabase SQL Editor if needed.

```bash
pnpm install
pnpm dev
```
