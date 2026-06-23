# Email Configuration Backup — Lovable Managed Setup

**Saved on:** 2026-03-05

## Sender Domain
- **Domain:** notify.duaraflow.co.ke
- **Root Domain:** duaraflow.co.ke
- **From Address:** Twende Green Ecocycle <noreply@duaraflow.co.ke>
- **Status:** drifted (DNS propagation pending)

## Auth Email Hook
- **Function:** `auth-email-hook`
- **Method:** Lovable managed email via `@lovable.dev/email-js` + `@lovable.dev/webhooks-js`
- **Sending:** `sendLovableEmail()` with `callback_url` from webhook payload
- **Purpose:** transactional (auth emails only)

## Email Templates
Templates in `supabase/functions/_shared/email-templates/`:
- signup.tsx
- magic-link.tsx
- recovery.tsx
- invite.tsx
- email-change.tsx
- reauthentication.tsx

## To Revert
1. Restore `supabase/functions/auth-email-hook/index.ts` to use `sendLovableEmail` (see git history)
2. Re-verify DNS records for `notify.duaraflow.co.ke`
3. Redeploy the `auth-email-hook` edge function
