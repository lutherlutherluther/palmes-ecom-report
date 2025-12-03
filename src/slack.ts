import fetch from "node-fetch";

const webhookUrl = process.env.SLACK_WEBHOOK_URL!;

export async function postToSlack(
  fullReport: string,
  execSummary: string,
  weekLabel: string
) {
  const text =
    `*Palmes Ecommerce Report – ${weekLabel}*\n\n` +
    `${fullReport}\n\n` +
    `*Executive Summary*\n${execSummary}`;

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`Slack post failed: ${res.status} ${await res.text()}`);
  }
}
