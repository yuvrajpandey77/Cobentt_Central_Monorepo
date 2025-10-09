---
title: Cogerphere Docs
---

# Cogerphere Documentation

Welcome to Cogerphere — the AI-powered app builder that turns product ideas into working projects. This docs hub covers product concepts, API usage, background jobs, sandbox previews, and deployment.

## Adaptive content

Deliver a tailored documentation experience based on who’s reading. This feature is available on the Ultimate site plan.

### How it works

- Readers are segmented by plan and role.
- Pages can display conditional callouts and links.
- Search indexes include gated content but respect access at view time.

## Core concepts

- Projects: Top-level unit that contains messages and generated fragments.
- Messages: Chat-like prompts and AI responses driving code generation.
- Fragments: Code units (web preview, APIs, assets) that compose your app.
- Sandbox Preview: Ephemeral environment to view and interact with fragments.

## Quick start

1. Create a new project from the home page.
2. Describe your app — frameworks, pages, data shape, integrations.
3. Inspect generated fragments, then open the sandbox preview.
4. Download the code bundle or continue iterating with new prompts.

## API endpoints

- `GET /api/projects`: List projects.
- `GET /api/projects/[id]`: Project details.
- `GET /api/projects/[id]/screenshot`: Project preview image.
- `POST /api/sandbox/restore`: Restore a sandbox for a fragment.

All endpoints require authentication via session cookies.

## Background jobs

We use Inngest to orchestrate long-running tasks, such as screenshot capture and AI processing. See `INNGEST_*` docs in this repo.

## Limits and quotas

- Sandbox lifetime: ~20 minutes idle.
- Screenshot generation: up to 1 per minute per project.
- Message size: 8k tokens per message.

## Support

For help, use the Support page in the app or contact support from the top navigation.

## Structure

- `README.md`: Landing page
- `SUMMARY.md`: Sidebar navigation
- `guides/`: How-to and tutorials
- `api/`: API reference overview and links
- `changelog/`: Product and docs changes

## Authoring Guidelines

- Use Markdown or MDX-like GitBook Markdown extensions (callouts, tabs)
- Keep titles in Sentence case
- Use relative links and local images under `docs/_assets`
- Prefer code fences with language tags

## GitBook Git Sync Setup

1. In GitBook, create a Space → Settings → Git Integrations → Connect GitHub repo.
2. Choose this repository and set root to `/docs`.
3. Enable two-way sync (optional) or one-way from Git if you prefer PR reviews.
4. Map branches: `staging` → Preview, `main` → Production.
5. Set custom domain in Space → Domain if needed.

## Local Preview (optional)

GitBook previews happen in the cloud. For local static checks, you can open Markdown in any viewer. Keep links and images relative.

## Conventions

- Use Conventional Commits with `docs:` scope.
- Each significant doc change should come via PR.
- Update `SUMMARY.md` when adding pages, to appear in the sidebar.


