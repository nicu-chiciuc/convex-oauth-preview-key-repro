#!/usr/bin/env node
export {};

const convexApi = "https://api.convex.dev";
const oauthToken = process.env.CONVEX_OAUTH_TOKEN?.replace(/^Bearer\s+/, "");

if (!oauthToken) {
  throw new Error("Set CONVEX_OAUTH_TOKEN");
}

// Find the team attached to this OAuth token. The setup script uses the team
// OAuth flow, so token_details should return a teamId.
const detailsResponse = await fetch(`${convexApi}/v1/token_details`, {
  headers: { Authorization: `Bearer ${oauthToken}` },
});
const detailsBody = await detailsResponse.json();
if (typeof detailsBody.teamId !== "number") {
  console.log("token_details:", detailsResponse.status, detailsBody);
  throw new Error("Expected a team-scoped OAuth token with teamId");
}

const projectName = process.argv[2] ?? `convex-oauth-preview-key-repro-${Date.now()}`;

// Create a disposable project with a production deployment. Skip this script if
// you want to reuse an existing project and already know its project id and
// deployment name.
const projectResponse = await fetch(
  `${convexApi}/v1/teams/${detailsBody.teamId}/create_project`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${oauthToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectName,
      deploymentType: "prod",
    }),
  },
);
const projectBody = await projectResponse.json();
if (
  typeof projectBody.id !== "number" ||
  typeof projectBody.deploymentName !== "string"
) {
  console.log("create_project:", projectResponse.status, projectBody);
  throw new Error("Could not create project with prod deployment");
}

console.log("\nAdd these to .env.local:\n");
console.log(`CONVEX_PROJECT_ID=${projectBody.id}`);
console.log(`CONVEX_DEPLOYMENT_NAME=${projectBody.deploymentName}`);
