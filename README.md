# Convex OAuth Preview Deploy Key Repro

Minimal reproduction for a Convex preview deploy key created through OAuth failing when it is used
as the bearer token for `claim_preview_deployment`.

The contrast is:

- `repro-preview.ts` creates a preview deploy key with an OAuth token, then uses the returned key for
  `POST /api/claim_preview_deployment`. This currently returns `401`.
- `repro-prod-control.ts` creates a normal prod/dev deployment deploy key with the same OAuth token,
  then uses the returned key with the Big Brain endpoints the Convex CLI uses for normal deployment
  keys. This works.

## Requirements

- Node.js 24 or newer.
- A Convex OAuth token with access to the target project/deployment.
- For the preview repro, the Convex project id.
- For the prod control, the Convex deployment name, without the `prod:` prefix.

## Setup

Create a local env file:

```bash
cp .env.example .env.local
```

Fill in the values:

```bash
CONVEX_OAUTH_TOKEN=...
CONVEX_PROJECT_ID=...
CONVEX_DEPLOYMENT_NAME=...
```

`.env.local` is ignored by git. This avoids putting the OAuth token in shell history, but it does
store the token on disk locally.

If these values are already set globally in your environment, omit `--env-file=.env.local` from the
commands below.

## Preview Key Repro

```bash
node --env-file=.env.local repro-preview.ts
```

Expected current result:

```text
create_preview_deploy_key: 200 { previewDeployKey: 'preview:team:project|[redacted]' }
claim_preview_deployment with returned preview key: 401 {"code":"AuthenticationFailed","message":"Invalid Convex preview deploy key"}
claim_preview_deployment with OAuth token directly: 200 ...
```

## Prod Deploy Key Control

This checks the matching working path for a normal deployment deploy key created through OAuth.

```bash
node --env-file=.env.local repro-prod-control.ts
```

Expected current result:

```text
create_deploy_key: 200 { deployKey: 'prod:deployment-name|[redacted]' }
deployment/url_for_key with returned deploy key: 200 ...
deployment/team_and_project_for_key with returned deploy key: 200 ...
```

## Notes

The scripts print only deploy key prefixes and redact the secret portion after `|`.

They do create deploy keys and, for the preview repro, may create or reuse a preview deployment. Use
a disposable Convex project if you want to avoid leaving diagnostic resources behind.
