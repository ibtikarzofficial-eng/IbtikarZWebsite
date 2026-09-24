# IbtikarZ — Cloudflare Pages deployment

## 1. Create the Pages project
Connect the GitHub repository in **Cloudflare → Workers & Pages → Create → Pages → Connect to Git**.

For this static repository:
- Framework preset: None
- Build command: `exit 0`
- Build output directory: `public`

The `public/` directory is the deployable static site. The `/functions` directory is the Cloudflare Pages Functions backend for lead forms.

## 2. Connect the production domain
Add `ibtikarz.com` under **Custom domains**. Keep Cloudflare DNS authoritative. Add `www.ibtikarz.com` too, then create a Cloudflare Redirect Rule sending `www.ibtikarz.com/*` → `https://ibtikarz.com/${1}` with 301 status. Domain-level redirects cannot be expressed in Pages `_redirects`.

## 3. Create the lead database (recommended)
Create a D1 database named `ibtikarz-leads`. Open its console and run `schema.sql`.

Then in **Pages project → Settings → Bindings**, add a D1 binding:
- Variable name: `LEADS_DB`
- Database: `ibtikarz-leads`

Redeploy after adding the binding. Every successful form submission is then stored server-side.

## 4. Email notifications (recommended)
Use Resend or another webhook-capable service. For the included Resend integration, verify a sending domain and add these Pages environment variables:
- `RESEND_API_KEY`
- `LEAD_FROM_EMAIL` = e.g. `IbtikarZ Leads <leads@ibtikarz.com>`
- `LEAD_TO_EMAIL` = `abdullah@ibtikarz.com`

D1 stores the lead even if email is temporarily unavailable.

Optional: set `LEAD_WEBHOOK_URL` to push each lead into Make/Zapier/n8n/your CRM.

## 5. Bot protection (recommended after launch)
Create a Cloudflare Turnstile widget for `ibtikarz.com`. Put the secret key in the Pages environment variable `TURNSTILE_SECRET_KEY`. Set the public site key in `public/assets/config.js`, then add the secret key as `TURNSTILE_SECRET_KEY`. The frontend widget and server validation are already wired in.

## 6. Test before DNS cutover
On the `pages.dev` preview:
1. Submit the free checkup.
2. Verify a D1 row is created.
3. Verify the email notification.
4. Confirm GA4 `generate_lead` fires only after the API returns success.
5. Check `/sitemap.xml`, `/robots.txt`, core service URLs and redirects.

## 7. Search migration
The canonical URLs remain `https://ibtikarz.com/...`, so moving hosting providers is not a domain migration. Do not change the canonical host. After cutover, resubmit the sitemap in Search Console and inspect the homepage plus the highest-value service pages.

## 8. Important preserved SEO assets
Do not delete or redirect the existing 3D cost/configurator URLs yet. They are intentionally preserved while IbtikarZ expands its WordPress/web/SEO architecture.
