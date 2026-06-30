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
- A Convex OAuth app client id and secret.
- A Convex team you can authorize for that OAuth app.

## Setup

Create a local env file:

```bash
cp .env.example .env.local
```

In the Convex OAuth app settings, add this redirect URL:

```text
http://localhost:32123/callback
```

Add it to the same OAuth app whose client id you put in `CONVEX_OAUTH_CLIENT_ID`.
The dashboard edit field accepts multiple redirect URIs as a comma-separated list:

```text
https://your-existing-callback, http://localhost:32123/callback
```

After saving, the dashboard should show `http://localhost:32123/callback` as its own bullet.

Fill in the OAuth app values in `.env.local`:

```bash
CONVEX_OAUTH_CLIENT_ID=...
CONVEX_OAUTH_CLIENT_SECRET=...
CONVEX_OAUTH_REDIRECT_URI=http://localhost:32123/callback
```

Then get an OAuth token through the team OAuth flow:

```bash
node --env-file=.env.local get-env.ts
```

Open the printed URL, authorize a team, then copy the redirected URL from the browser address bar
and paste it back into the script. The localhost page does not need to load.

Paste the printed `CONVEX_OAUTH_TOKEN` value back into `.env.local`.

To reuse an existing project, fill in these values yourself:

```bash
CONVEX_PROJECT_ID=...
CONVEX_DEPLOYMENT_NAME=...
```

`CONVEX_DEPLOYMENT_NAME` is the raw deployment name, without the `prod:` prefix.

To create a fresh disposable project instead, run:

```bash
node --env-file=.env.local create-project.ts
```

Paste the printed `CONVEX_PROJECT_ID` and `CONVEX_DEPLOYMENT_NAME` values back into `.env.local`.

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

Only `create-project.ts` creates a Convex project. The repro scripts create deploy keys and, for the
preview repro, may create or reuse a preview deployment.
