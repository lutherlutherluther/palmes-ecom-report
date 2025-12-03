import OpenAI from "openai";
import type { WeeklySummaryRow } from "./sheets";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function generateWeeklyReport(
  summary: WeeklySummaryRow
): Promise<string> {
  const prompt = `
You are an ecommerce analytics assistant for a fashion brand.

Create a clear, factual weekly performance report based on this data:

Week label: ${summary.weekLabel}
Period: ${summary.startDate} to ${summary.endDate}

Totals:
- Revenue (DKK): ${summary.totalRevenueDkk}
- Revenue (USD): ${summary.totalRevenueUsd}
- Revenue (EUR): ${summary.totalRevenueEur}
- Revenue (GBP): ${summary.totalRevenueGbp}

Orders:
- Total orders: ${summary.orderCount}
- Orders by currency: DKK=${summary.dkkOrders}, USD=${summary.usdOrders}, EUR=${summary.eurOrders}, GBP=${summary.gbpOrders}

Previous week:
- Previous week revenue (DKK): ${
    summary.prevWeekRevenueDkk !== undefined
      ? summary.prevWeekRevenueDkk
      : "N/A"
  }

Write the report in Markdown with these sections:

## Overview
- Short description of the week.

## Revenue
- Key revenue figures in DKK, USD, EUR, GBP.

## Orders
- Total orders and any notable changes.

## Currency Mix
- Which currencies contributed most to revenue and order volume.

## Week-over-Week
- Compare this week vs previous week on revenue and orders (only if previous week data exists).

Rules:
- Use only the data given; do not invent numbers.
- Keep tone businesslike and concise.
- No emojis.
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return completion.choices[0].message.content?.trim() ?? "";
}

export async function generateExecutiveSummary(
  fullReport: string
): Promise<string> {
  const prompt = `
You are writing for the CEO.

Based on the following detailed weekly ecommerce report, write a short executive summary:

${fullReport}

Guidelines:
- Return 3 to 5 bullet points.
- Each bullet should start with a bold label, e.g. "**Revenue**: ..." or "**Orders**: ...".
- Focus on: overall revenue in DKK, growth/decline vs last week, changes in order volume, and any notable shift in currency mix.
- Use clear, decision-focused language.
- No emojis.
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return completion.choices[0].message.content?.trim() ?? "";
}
