#!/usr/bin/env node
export {};

const convexApi = "https://api.convex.dev";
const oauthToken = process.env.CONVEX_OAUTH_TOKEN?.replace(/^Bearer\s+/, "");
const projectId = process.env.CONVEX_PROJECT_ID;
const previewName = `oauth-preview-key-repro-${Date.now()}`;

if (!oauthToken || !projectId) {
  throw new Error("Set CONVEX_OAUTH_TOKEN and CONVEX_PROJECT_ID");
}

// 1. Create a preview deploy key using a Convex OAuth token.
const createKeyResponse = await fetch(
  `${convexApi}/v1/projects/${projectId}/create_preview_deploy_key`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${oauthToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: previewName }),
  },
);
const createKeyBody = await createKeyResponse.json();

if (typeof createKeyBody.previewDeployKey !== "string") {
  console.log("create_preview_deploy_key:", createKeyResponse.status, createKeyBody);
  throw new Error("create_preview_deploy_key did not return previewDeployKey");
}

const previewDeployKey = createKeyBody.previewDeployKey;
const previewKeyPrefix = previewDeployKey.split("|")[0];
const [, teamSlug, projectSlug] = previewKeyPrefix.split(":");

console.log("create_preview_deploy_key:", createKeyResponse.status, {
  previewDeployKey: `${previewKeyPrefix}|[redacted]`,
});

const claimPreviewDeploymentBody = {
  projectSelection: {
    kind: "teamAndProjectSlugs",
    teamSlug,
    projectSlug,
  },
  identifier: previewName,
  reuse: true,
};

// 2. Use the returned preview key the same way `convex deploy --preview-name` does.
// This currently fails with HTTP 401: "Invalid Convex preview deploy key".
const previewKeyClaimResponse = await fetch(`${convexApi}/api/claim_preview_deployment`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${previewDeployKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(claimPreviewDeploymentBody),
});
console.log(
  "claim_preview_deployment with returned preview key:",
  previewKeyClaimResponse.status,
  await previewKeyClaimResponse.text(),
);

// 3. Send the same request with the OAuth token directly. This succeeds, so the
// project selection and request body are valid.
const oauthClaimResponse = await fetch(`${convexApi}/api/claim_preview_deployment`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${oauthToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(claimPreviewDeploymentBody),
});
console.log(
  "claim_preview_deployment with OAuth token directly:",
  oauthClaimResponse.status,
  (await oauthClaimResponse.text()).replace(/"adminKey":"[^"]+"/, '"adminKey":"[redacted]"'),
);
