#!/usr/bin/env node
export {};

const convexApi = "https://api.convex.dev";
const oauthToken = process.env.CONVEX_OAUTH_TOKEN?.replace(/^Bearer\s+/, "");
const deploymentName = process.env.CONVEX_DEPLOYMENT_NAME;
const keyName = `oauth-prod-key-repro-${Date.now()}`;

if (!oauthToken || !deploymentName) {
  throw new Error("Set CONVEX_OAUTH_TOKEN and CONVEX_DEPLOYMENT_NAME");
}

// 1. Create a normal deployment deploy key using a Convex OAuth token.
const createKeyResponse = await fetch(
  `${convexApi}/v1/deployments/${deploymentName}/create_deploy_key`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${oauthToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: keyName }),
  },
);
const createKeyBody = await createKeyResponse.json();

if (typeof createKeyBody.deployKey !== "string") {
  console.log("create_deploy_key:", createKeyResponse.status, createKeyBody);
  throw new Error("create_deploy_key did not return deployKey");
}

const deployKey = createKeyBody.deployKey;
const deployKeyPrefix = deployKey.split("|")[0];

console.log("create_deploy_key:", createKeyResponse.status, {
  deployKey: `${deployKeyPrefix}|[redacted]`,
});

// 2. Use the returned deploy key the same way the Convex CLI does when
// CONVEX_DEPLOY_KEY is set to a normal prod/dev deployment key.
const urlForKeyResponse = await fetch(`${convexApi}/api/deployment/url_for_key`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${deployKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ deployKey }),
});
console.log(
  "deployment/url_for_key with returned deploy key:",
  urlForKeyResponse.status,
  await urlForKeyResponse.text(),
);

// 3. The CLI also asks Big Brain which team/project this deploy key belongs to.
const teamProjectResponse = await fetch(`${convexApi}/api/deployment/team_and_project_for_key`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${deployKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ deployKey }),
});
console.log(
  "deployment/team_and_project_for_key with returned deploy key:",
  teamProjectResponse.status,
  await teamProjectResponse.text(),
);
