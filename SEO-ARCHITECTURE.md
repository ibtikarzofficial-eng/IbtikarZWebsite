# IbtikarZ SEO architecture — 24 Sep 2026

## Primary commercial owners
- `/web-development/` — business / lead-generation website development
- `/wordpress-development/` — WordPress development
- `/website-redesign/` — website redesign / Website Rescue Sprint
- `/landing-page-development/` — landing page development
- `/wordpress-speed-optimization/` — WordPress speed / Core Web Vitals
- `/website-audit/` — paid website audit
- `/seo/` — SEO overview
- `/technical-seo/` — technical SEO
- `/local-seo/` — local SEO
- `/website-maintenance/` — website/WordPress care plan
- `/industries/visa-education-consultants/` — niche proof/intent page

## High-intent supporting content
- `/insights/wordpress-website-cost-pakistan/`
- `/insights/website-redesign-cost/`
- `/insights/wordpress-speed-optimization-guide/`
- `/insights/seo-cost-pakistan/`
- `/insights/wordpress-vs-custom-website/`

## Preserved 3D assets
Existing URLs stay live because they already have Search Console visibility. 3D is no longer the main navigation proposition, but the current rankings are not discarded. If/when Zaexis launches, migrate these one-to-one with permanent redirects only after equivalent pages exist.

## Conversion architecture
Search/article/case study → relevant commercial page → free checkup or project brief → Cloudflare Pages Function → D1 + email/webhook → GA4 `generate_lead` only after confirmed backend success.
