import { NextRequest } from "next/server";
import { interpret } from "@/lib/coach/engine";
import { actionSchemaForLlm } from "@/lib/coach/engine";
import type { CoachContext, CoachResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { message?: string; context?: CoachContext };
  const message = body.message?.trim() ?? "";
  const context = body.context;
  if (!context) {
    return Response.json({ error: "Missing account context." }, { status: 400 });
  }

  const local = interpret(message, context);
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json(local satisfies CoachResult);
  }

  try {
    const llm = await interpretWithLlm(message, context, key);
    return Response.json(llm);
  } catch {
    return Response.json(local);
  }
}

async function interpretWithLlm(
  message: string,
  context: CoachContext,
  apiKey: string,
): Promise<CoachResult> {
  const snapshot = context.campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    objective: c.objective,
    dailyBudget: c.dailyBudget,
    targeting: c.targeting,
    spent: c.stats.spent,
    results: c.stats.results,
    resultLabel: c.stats.resultLabel,
    ctr: c.stats.ctr,
    roas: c.stats.roas,
  }));

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are AdCoach, a senior Facebook ads manager helping a small-business owner who does not know ads. Return ONLY JSON matching this schema:\n${actionSchemaForLlm}`,
        },
        {
          role: "user",
          content: JSON.stringify({
            message,
            dailyCap: context.account.dailyCap,
            businessName: context.account.businessName,
            connection: context.connection.status,
            campaigns: snapshot,
          }),
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error("LLM request failed");
  }

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const parsed = JSON.parse(json.choices[0].message.content) as CoachResult;
  if (!parsed.reply || !Array.isArray(parsed.actions)) {
    throw new Error("Bad LLM payload");
  }
  return {
    reply: parsed.reply,
    needsConfirm: Boolean(parsed.needsConfirm),
    confirmReason: parsed.confirmReason,
    actions: parsed.actions ?? [],
    suggestions: parsed.suggestions ?? [],
  };
}
