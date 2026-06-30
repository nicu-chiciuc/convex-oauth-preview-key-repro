#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const convexApi = "https://api.convex.dev";
const clientId = process.env.CONVEX_OAUTH_CLIENT_ID;
const clientSecret = process.env.CONVEX_OAUTH_CLIENT_SECRET;
const redirectUri = process.env.CONVEX_OAUTH_REDIRECT_URI;

if (!clientId || !clientSecret || !redirectUri) {
  throw new Error(
    "Set CONVEX_OAUTH_CLIENT_ID, CONVEX_OAUTH_CLIENT_SECRET, and CONVEX_OAUTH_REDIRECT_URI",
  );
}

const authorizeUrl = new URL("https://dashboard.convex.dev/oauth/authorize/project");
authorizeUrl.searchParams.set("client_id", clientId);
authorizeUrl.searchParams.set("redirect_uri", redirectUri);
authorizeUrl.searchParams.set("response_type", "code");
authorizeUrl.searchParams.set("state", `convex-oauth-preview-key-repro-${Date.now()}`);

console.log("Open this URL and authorize a Convex project:\n");
console.log(authorizeUrl.href);
console.log();

const prompts = createInterface({ input: stdin, output: stdout });
const pasted = await prompts.question("Paste the redirected URL or code: ");
prompts.close();

let code = pasted.trim();
if (code.startsWith("http://") || code.startsWith("https://")) {
  code = new URL(code).searchParams.get("code") ?? "";
}
if (!code) {
  throw new Error("No OAuth code found");
}

const tokenResponse = await fetch(`${convexApi}/oauth/token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  }),
});
const tokenBody = await tokenResponse.json();
if (typeof tokenBody.access_token !== "string") {
  console.log("oauth/token:", tokenResponse.status, tokenBody);
  throw new Error("OAuth token exchange did not return access_token");
}

const oauthToken = tokenBody.access_token;
const detailsResponse = await fetch(`${convexApi}/v1/token_details`, {
  headers: { Authorization: `Bearer ${oauthToken}` },
});
const detailsBody = await detailsResponse.json();
if (typeof detailsBody.projectId !== "number") {
  console.log("token_details:", detailsResponse.status, detailsBody);
  throw new Error("Expected a project-scoped OAuth token with projectId");
}

const projectId = String(detailsBody.projectId);
const deploymentResponse = await fetch(
  `${convexApi}/v1/projects/${projectId}/deployment?defaultProd=true`,
  { headers: { Authorization: `Bearer ${oauthToken}` } },
);
const deploymentBody = await deploymentResponse.json();
if (typeof deploymentBody.name !== "string") {
  console.log("default prod deployment:", deploymentResponse.status, deploymentBody);
  throw new Error("Could not find default prod deployment name");
}

console.log("\nAdd these to .env.local:\n");
console.log(`CONVEX_OAUTH_TOKEN=${oauthToken}`);
console.log(`CONVEX_PROJECT_ID=${projectId}`);
console.log(`CONVEX_DEPLOYMENT_NAME=${deploymentBody.name}`);
