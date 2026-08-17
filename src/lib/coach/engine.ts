import { objectiveCopy, targetingSentence } from "../copy";
import { money } from "../format";
import { coachTake, defaultCreative, isUnderperforming, isWinning } from "./apply";
import type {
  AdCreative,
  CoachAction,
  CoachContext,
  CoachResult,
  Campaign,
  Gender,
  Objective,
  Placement,
  Targeting,
} from "../types";

const CREATE =
  /\b(create|launch|start|make|set up|setup|run|promote|advertise|draft)\b/i;
const PAUSE = /\b(pause|stop|turn off|shut off|hold|don't run|do not run)\b/i;
const RESUME = /\b(resume|unpause|turn (it |them |the ads )?back on|restart|go live|start running)\b/i;
const BUDGET =
  /\b(budget|spend|spending|cheaper|less money|more money|increase spend|decrease|lower (my )?spend|raise (the )?budget|\$)\b/i;
const TARGET =
  /\b(target|targeting|show (it |this |the ads? )?to|only (show|run)|ages?|years old|women|men|ladies|near me|nearby|local|in [a-z]|who like|interested in|audience)\b/i;
const OBJECTIVE =
  /\b(goal|objective|purpose|i want (more )?(customers|sales|clicks|visits|messages|leads|signups|awareness)|website visits|get (the )?word out)\b/i;
const PLACEMENT = /\b(instagram|facebook feed|stories|reels|placement|where (it|they|the ads?) (show|appear))\b/i;
const OPTIMIZE =
  /\b(optimiz|not working|isn't working|arent working|aren't working|wasting money|spend smarter|fix my ads|what's wrong|underperform)\b/i;
const SPEND_REPORT = /\b(how much|spent|spending so far|what did i spend|cost me)\b/i;
const PERFORMANCE =
  /\b(working|results?|performance|ctr|roas|clicks|what's happening|how are (my|the) ads)\b/i;
const EXPLAIN = /\b(explain|what does|plain english|tell me about|what is this)\b/i;
const LIST = /\b(list|show (me )?(my )?ads|what ads|which campaigns)\b/i;
const CAP = /\b(cap|don't (let me )?spend more than|limit|max(imum)? (daily )?spend|never spend more)\b/i;
const CONNECT = /\b(connect (to )?facebook|log in to facebook|link (my )?ad account|meta)\b/i;
const HELP = /^(help|hi|hello|hey|what can you do|how does this work)[?.!]?$/i;

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractMoney(text: string): { amount: number; period: "day" | "week" | "month" | "none" } | null {
  const monthly = text.match(/\$?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:a|per|\/)\s*month|monthly(?: budget)?(?: of)?\s*\$?\s*([\d,]+)/i);
  const weekly = text.match(/\$?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:a|per|\/)\s*week/i);
  const daily = text.match(
    /\$\s*([\d,]+(?:\.\d{1,2})?)(?:\s*(?:a|per|\/)\s*day)?|([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?)(?:\s*(?:a|per)\s*day)?/i,
  );

  const parse = (raw: string) => Number(raw.replace(/,/g, ""));

  if (monthly) {
    const n = parse(monthly[1] || monthly[2]);
    if (!Number.isNaN(n)) return { amount: n, period: "month" };
  }
  if (weekly) {
    const n = parse(weekly[1]);
    if (!Number.isNaN(n)) return { amount: n, period: "week" };
  }
  if (daily) {
    const n = parse(daily[1] || daily[2]);
    if (!Number.isNaN(n) && n > 0) {
      const isDay = /(a|per|\/)\s*day/i.test(text) || /\$/.test(text);
      return { amount: n, period: isDay ? "day" : "none" };
    }
  }
  return null;
}

function toDaily(amount: number, period: "day" | "week" | "month" | "none"): number {
  if (period === "week") return Math.max(1, Math.round(amount / 7));
  if (period === "month") return Math.max(1, Math.round(amount / 30));
  return Math.round(amount);
}

function extractAges(text: string): { ageMin?: number; ageMax?: number } {
  const range = text.match(/ages?\s*(\d{2})\s*(?:-|–|to)\s*(\d{2})|(\d{2})\s*(?:-|–|to)\s*(\d{2})/);
  if (range) {
    const a = Number(range[1] || range[3]);
    const b = Number(range[2] || range[4]);
    if (a >= 13 && b <= 65 && a < b) return { ageMin: a, ageMax: b };
  }
  const plus = text.match(/(\d{2})\s*\+|(\d{2})\s*and up|over\s*(\d{2})/i);
  if (plus) {
    const n = Number(plus[1] || plus[2] || plus[3]);
    if (n >= 13 && n < 65) return { ageMin: n, ageMax: 65 };
  }
  const under = text.match(/under\s*(\d{2})/i);
  if (under) {
    const n = Number(under[1]);
    if (n > 18) return { ageMin: 18, ageMax: n };
  }
  return {};
}

function extractGender(text: string): Gender | undefined {
  if (/\b(everyone|all genders|men and women|women and men)\b/i.test(text)) return "all";
  if (/\b(women|ladies|female)\b/i.test(text)) return "women";
  if (/\b(men|male|guys)\b/i.test(text)) return "men";
  return undefined;
}

function extractLocations(text: string): string[] {
  const found: string[] = [];
  const nearby = /\b(near me|nearby|locally|people nearby|around here|in my (city|town|area))\b/i.test(text);
  if (nearby) found.push("people near your business");

  const inPhrase = text.match(
    /\bin\s+([A-Z][A-Za-z.]+(?:[\s,][A-Z][A-Za-z.]+){0,3})/g,
  );
  if (inPhrase) {
    for (const phrase of inPhrase) {
      const loc = phrase.replace(/^in\s+/i, "").replace(/\.$/, "");
      if (!/^(the )?(facebook|instagram|feed|ad|campaign)/i.test(loc)) {
        found.push(loc);
      }
    }
  }

  const lower = text.match(
    /\bin\s+(tampa|miami|orlando|chicago|austin|dallas|seattle|portland|denver|boston|atlanta|phoenix|houston|nashville|the united states|us|usa|texas|florida|california|new york)\b/i,
  );
  if (lower) {
    const pretty = titleCase(lower[1].replace(/\b(us|usa)\b/i, "United States"));
    if (!found.some((f) => f.toLowerCase() === pretty.toLowerCase())) found.push(pretty);
  }

  return [...new Set(found)];
}

function extractInterests(text: string): string[] {
  const match = text.match(
    /(?:who like|interested in|into|that like|people who (?:like|love))\s+(.+?)(?:\.|$| ages| in | for | with | at )/i,
  );
  if (!match) return [];
  return match[1]
    .split(/,| and /)
    .map((s) => s.trim().replace(/[.?]$/, ""))
    .filter((s) => s.length > 1 && s.length < 40);
}

function extractObjective(text: string): Objective | undefined {
  if (/\b(purchase|buy|sales|shop|orders?)\b/i.test(text)) return "sales";
  if (/\b(lead|signup|sign up|quote|waitlist|email list)\b/i.test(text)) return "leads";
  if (/\b(message|messenger|whatsapp|chat|conversations?)\b/i.test(text)) return "messages";
  if (/\b(like|comment|share|engagement|followers?)\b/i.test(text)) return "engagement";
  if (/\b(awareness|get (the )?word out|brand|known)\b/i.test(text)) return "awareness";
  if (/\b(traffic|website|visit|clicks?|site)\b/i.test(text)) return "traffic";
  if (/\bcustomers?\b/i.test(text)) return "traffic";
  return undefined;
}

function extractPlacements(text: string): Placement[] | undefined {
  const list: Placement[] = [];
  if (/\bautomatic|everywhere|let facebook pick\b/i.test(text)) return ["automatic"];
  if (/\binstagram\b/i.test(text) && !/\bfacebook\b/i.test(text)) list.push("instagram_feed");
  if (/\bfacebook feed|only facebook\b/i.test(text)) list.push("facebook_feed");
  if (/\bstories\b/i.test(text)) list.push("stories");
  if (/\breels\b/i.test(text)) list.push("reels");
  return list.length ? list : undefined;
}

function extractUrl(text: string): string | undefined {
  const m = text.match(/https?:\/\/[^\s)]+/i);
  return m?.[0];
}

function extractHeadline(text: string): Partial<AdCreative> | undefined {
  const headline = text.match(/headline\s+["“](.+?)["”]/i);
  const say = text.match(/(?:say|copy should be|the ad should say)\s+["“](.+?)["”]/i);
  const cta = text.match(
    /\b(learn more|shop now|sign up|book now|send message|get quote|call now)\b/i,
  );
  const patch: Partial<AdCreative> = {};
  if (headline) patch.headline = headline[1];
  if (say) patch.primaryText = say[1];
  if (cta) patch.cta = titleCase(cta[1]);
  const url = extractUrl(text);
  if (url) patch.destinationUrl = url;
  return Object.keys(patch).length ? patch : undefined;
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function extractCampaignName(text: string): string | undefined {
  const named = text.match(
    /(?:called|named|campaign(?: called)?)\s+["“]?([^"'”.,]+)["”]?/i,
  );
  if (named) return named[1].trim();
  const forMy = text.match(/\bfor (?:my |our |a )?([a-z0-9][a-z0-9 &'/-]{2,40})/i);
  if (forMy) {
    const raw = forMy[1].replace(/\s+(in|to|who|with|at|for)\b[\s\S]*$/i, "").trim();
    if (raw && !/^(ad|ads|campaign|facebook|instagram)$/i.test(raw)) return titleCase(raw);
  }
  return undefined;
}

function resolveCampaigns(text: string, campaigns: Campaign[]): Campaign[] {
  const lower = text.toLowerCase();
  if (/\b(all|everything|every ad|all ads|all campaigns|my ads)\b/i.test(text)) {
    return campaigns;
  }
  const hits = campaigns.filter((c) => {
    const hay = `${c.name} ${c.business} ${c.objective} ${c.ad.headline}`.toLowerCase();
    return hay.split(/\W+/).some((word) => word.length > 3 && lower.includes(word));
  });
  if (hits.length) return hits;

  const nicknames: [RegExp, string][] = [
    [/bakery|bread|rye|harbor/, "camp_bakery"],
    [/workshop|sourdough|class|saturday/, "camp_workshop"],
    [/holiday|gift|box/, "camp_gifts"],
  ];
  const byNick = campaigns.filter((c) =>
    nicknames.some(([re, id]) => re.test(lower) && c.id === id),
  );
  if (byNick.length) return byNick;

  if (/\b(the ad|this ad|it|the campaign)\b/i.test(text) && campaigns.length === 1) {
    return campaigns;
  }
  return [];
}

function suggestionsFor(intent: string): string[] {
  switch (intent) {
    case "create":
      return ["Make the budget $20 a day", "Only show it to people nearby", "Change the goal to collect emails"];
    case "report":
      return ["Pause ads that aren't working", "Put more money into what's working"];
    case "optimize":
      return ["Explain why you paused that", "Turn the holiday ads back on at $15 a day"];
    default:
      return [
        "What's working right now?",
        "Create an ad for weekend brunch, $15 a day",
        "Don't spend more than $60 a day",
      ];
  }
}

function unknown(text: string): CoachResult {
  return {
    reply: `I didn't fully catch that. Try it like you'd text a media buyer:\n\n• “Create an ad for my coffee shop, $20 a day, people nearby who like espresso”\n• “Pause the holiday ads”\n• “Only show to women 30–50 in Miami”\n• “How much have I spent?”\n\nYou wrote: “${text}”`,
    needsConfirm: false,
    actions: [],
    suggestions: suggestionsFor("default"),
  };
}

export function interpret(raw: string, ctx: CoachContext): CoachResult {
  const text = normalize(raw);
  if (!text) {
    return {
      reply: "Tell me what you want in everyday language. I'll turn it into campaign settings.",
      needsConfirm: false,
      actions: [],
      suggestions: suggestionsFor("default"),
    };
  }

  if (HELP.test(text)) {
    return {
      reply: "I manage Facebook ads the way a hired media buyer would — spend, who sees them, the goal, and the settings — and I explain it without the jargon.\n\nYou don't need to know what an ad set is. Say what you want, I'll do the clicking.",
      needsConfirm: false,
      actions: [],
      suggestions: suggestionsFor("default"),
    };
  }

  if (CONNECT.test(text)) {
    return {
      reply: ctx.connection.status === "connected"
        ? `You're already connected${ctx.connection.adAccountName ? ` as ${ctx.connection.adAccountName}` : ""}. Changes I make can go to Facebook.`
        : ctx.connection.configured
          ? "Facebook is set up on this app. Open Settings and hit Connect Facebook — you'll pick the ad account, then I can pause, budget, and create for real."
          : "Facebook isn't connected yet. Open Settings, add your Meta App ID and secret to `.env.local`, then come back and connect. Until then I run a realistic demo so you can learn the ropes.",
      needsConfirm: false,
      actions: [],
      suggestions: ["Open settings for me — what do I need?", "Keep going in demo mode"],
    };
  }

  if (CAP.test(text)) {
    const moneyFound = extractMoney(text);
    const daily = moneyFound ? toDaily(moneyFound.amount, moneyFound.period === "none" ? "day" : moneyFound.period) : 60;
    return {
      reply: `I'll keep every running ad combined at ${money(daily)} a day or less. If they add up to more, I'll scale them down so you don't blow past it. That's a safety net — Facebook won't do this for you by default.`,
      needsConfirm: false,
      actions: [{ type: "set_account_cap", dailyCap: daily }],
      suggestions: ["What's my current daily spend?", "Raise the cap to $100"],
    };
  }

  if (CREATE.test(text) && !PAUSE.test(text)) {
    return buildCreate(text, ctx);
  }

  if (OPTIMIZE.test(text) && !CREATE.test(text)) {
    return buildOptimize(ctx);
  }

  const matched = resolveCampaigns(text, ctx.campaigns);
  const needsTarget = matched.length === 0 && (PAUSE.test(text) || RESUME.test(text) || BUDGET.test(text) || TARGET.test(text));

  if (PAUSE.test(text) && !RESUME.test(text)) {
    if (/\b(that aren't working|that isnt working|underperform|wasting)\b/i.test(text)) {
      return buildOptimize(ctx);
    }
    const targets = matched.length ? matched : ctx.campaigns.filter((c) => c.status === "active");
    if (!targets.length) {
      return { reply: "Nothing is running to pause.", needsConfirm: false, actions: [], suggestions: suggestionsFor("default") };
    }
    return {
      reply: `I'll pause ${listNames(targets)}. They stop showing today. You won't be charged further except for clicks already in flight. Say “turn them back on” anytime.`,
      needsConfirm: false,
      actions: [{ type: "pause", campaignIds: targets.map((c) => c.id) }],
      suggestions: ["Turn them back on", "What's still running?"],
    };
  }

  if (RESUME.test(text)) {
    const targets = matched.length ? matched : ctx.campaigns.filter((c) => c.status === "paused");
    if (!targets.length) {
      return { reply: "I don't see a paused ad to turn back on. Which one did you mean?", needsConfirm: false, actions: [], suggestions: ctx.campaigns.map((c) => `Turn on ${c.name}`) };
    }
    const moneyFound = extractMoney(text);
    const actions: CoachAction[] = [{ type: "resume", campaignIds: targets.map((c) => c.id) }];
    if (moneyFound) {
      actions.push({
        type: "update_budget",
        campaignIds: targets.map((c) => c.id),
        dailyBudget: toDaily(moneyFound.amount, moneyFound.period === "none" ? "day" : moneyFound.period),
      });
    }
    const daily = moneyFound ? toDaily(moneyFound.amount, moneyFound.period === "none" ? "day" : moneyFound.period) : targets[0].dailyBudget;
    const confirm = daily >= 200;
    return {
      reply: `I'll turn ${listNames(targets)} back on at ${money(daily)} a day.`,
      needsConfirm: confirm,
      confirmReason: confirm ? `That's ${money(daily)}/day — I want you to be sure.` : undefined,
      actions,
      suggestions: ["Keep it paused actually", "Only show it locally"],
    };
  }

  if (TARGET.test(text) && matched.length) {
    const patch: Partial<Targeting> = {};
    const ages = extractAges(text);
    if (ages.ageMin) patch.ageMin = ages.ageMin;
    if (ages.ageMax) patch.ageMax = ages.ageMax;
    const gender = extractGender(text);
    if (gender) patch.gender = gender;
    const locations = extractLocations(text);
    if (locations.length) patch.locations = locations;
    const interests = extractInterests(text);
    if (interests.length) patch.interests = interests;
    if (Object.keys(patch).length === 0) {
      return {
        reply: `${matched[0].name} currently shows to ${targetingSentence(matched[0].targeting)} Tell me who should see it — city, ages, women/men, or interests.`,
        needsConfirm: false,
        actions: [],
        suggestions: ["Only people nearby", "Women 25–45", "People who like coffee and brunch"],
      };
    }
    const preview: Targeting = { ...matched[0].targeting, ...patch };
    return {
      reply: `I'll update who sees ${listNames(matched)}. After this, the ad shows to ${targetingSentence(preview)} Facebook calls this “targeting.” You can always widen it later if results dry up.`,
      needsConfirm: false,
      actions: [{ type: "update_targeting", campaignIds: matched.map((c) => c.id), targeting: patch }],
      suggestions: ["Make the ages 21–65", "Add Instagram only"],
    };
  }

  if (OBJECTIVE.test(text) && (matched.length || ctx.campaigns.length === 1)) {
    const objective = extractObjective(text);
    const targets = matched.length ? matched : ctx.campaigns;
    if (!objective) {
      return {
        reply: "What should this ad try to do — website visits, messages, signups, or sales?",
        needsConfirm: false,
        actions: [],
        suggestions: ["I want more website visits", "I want people to message me", "I want purchases"],
      };
    }
    return {
      reply: `Goal for ${listNames(targets)} is now “${objectiveCopy[objective].label.toLowerCase()}.” ${objectiveCopy[objective].help}`,
      needsConfirm: false,
      actions: [{ type: "update_objective", campaignIds: targets.map((c) => c.id), objective }],
      suggestions: suggestionsFor("default"),
    };
  }

  if (PLACEMENT.test(text) && matched.length) {
    const placements = extractPlacements(text) ?? ["automatic"];
    return {
      reply: `I'll change where ${listNames(matched)} can appear. ${placements.includes("automatic") ? "Facebook will pick the cheapest spots that still reach the right people — that's usually what I'd recommend." : "It will only show in the places you named."}`,
      needsConfirm: false,
      actions: [{ type: "update_placements", campaignIds: matched.map((c) => c.id), placements }],
      suggestions: ["Go back to automatic placements"],
    };
  }

  const adPatch = extractHeadline(text);
  if (adPatch && matched.length) {
    return {
      reply: `I'll update the words on ${listNames(matched)}. People usually read the first two lines and the button — that's all I changed.`,
      needsConfirm: false,
      actions: [{ type: "update_ad", campaignIds: matched.map((c) => c.id), ad: adPatch }],
      suggestions: ["Change the button to Shop now"],
    };
  }

  if (BUDGET.test(text)) {
    const targets = matched.length ? matched : ctx.campaigns.filter((c) => c.status === "active");
    if (!targets.length) {
      return unknown(text);
    }
    const moneyFound = extractMoney(text);
    let daily: number | undefined;
    if (moneyFound) {
      daily = toDaily(moneyFound.amount, moneyFound.period === "none" ? "day" : moneyFound.period);
    } else if (/\b(cheaper|less|lower|decrease|cut)\b/i.test(text)) {
      daily = Math.max(1, Math.round(targets[0].dailyBudget * 0.7));
    } else if (/\b(more|increase|raise|boost)\b/i.test(text)) {
      daily = Math.round(targets[0].dailyBudget * 1.25);
    }
    if (daily == null) {
      return {
        reply: `${listNames(targets)} ${targets.length === 1 ? "is" : "are"} at ${money(targets[0].dailyBudget)}/day. Tell me a number, like “$20 a day.”`,
        needsConfirm: false,
        actions: [],
        suggestions: ["Set it to $20 a day", "Cut spend by a third"],
      };
    }
    const confirm = daily >= 200 || daily > targets[0].dailyBudget * 2;
    return {
      reply: `I'll set ${listNames(targets)} to ${money(daily)} a day. That's the most Facebook can spend in 24 hours — some days it'll be a little under.`,
      needsConfirm: confirm,
      confirmReason: confirm
        ? `That's a big jump to ${money(daily)}/day. Confirm and I'll do it.`
        : undefined,
      actions: [{ type: "update_budget", campaignIds: targets.map((c) => c.id), dailyBudget: daily }],
      suggestions: ["Also cap all ads at $80 a day", "Pause it instead"],
    };
  }

  if (needsTarget) {
    return {
      reply: `Which ad should I change? You have: ${ctx.campaigns.map((c) => c.name).join("; ")}.`,
      needsConfirm: false,
      actions: [],
      suggestions: ctx.campaigns.slice(0, 3).map((c) => `Update ${c.name}`),
    };
  }

  if (SPEND_REPORT.test(text) || (PERFORMANCE.test(text) && !CREATE.test(text))) {
    return buildReport(ctx);
  }

  if (EXPLAIN.test(text) || LIST.test(text)) {
    return buildReport(ctx);
  }

  if (CREATE.test(text)) return buildCreate(text, ctx);

  return unknown(text);
}

function listNames(campaigns: Campaign[]): string {
  if (campaigns.length === 1) return campaigns[0].name;
  if (campaigns.length === 2) return `${campaigns[0].name} and ${campaigns[1].name}`;
  return `${campaigns.length} ads`;
}

function buildCreate(text: string, ctx: CoachContext): CoachResult {
  const nameHint = extractCampaignName(text);
  const objective = extractObjective(text) ?? "traffic";
  const moneyFound = extractMoney(text);
  const daily = moneyFound
    ? toDaily(moneyFound.amount, moneyFound.period === "none" ? "day" : moneyFound.period)
    : 20;
  const ages = extractAges(text);
  const gender = extractGender(text) ?? "all";
  const locations = extractLocations(text);
  const interests = extractInterests(text);
  const placements = extractPlacements(text) ?? ["automatic"];
  const business = nameHint ?? ctx.account.businessName ?? "your business";
  const name = nameHint ? `${nameHint} — ${objectiveCopy[objective].label}` : `${business} — new ad`;
  const adPatch = extractHeadline(text);
  const ad = { ...defaultCreative({ business, objective }), ...adPatch };

  const targeting: Targeting = {
    locations: locations.length ? locations : ["people near your business"],
    ageMin: ages.ageMin ?? 25,
    ageMax: ages.ageMax ?? 54,
    gender,
    interests: interests.length ? interests : [],
  };

  const confirm = daily >= 200;
  return {
    reply: `Here's the ad I'd run.\n\nName: ${name}\nGoal: ${objectiveCopy[objective].label}. ${objectiveCopy[objective].help}\nSpend: ${money(daily)} a day.\nWho sees it: ${targetingSentence(targeting)}\nThe ad: “${ad.headline}” with a ${ad.cta} button.\n\n${ctx.connection.status === "connected" ? "Because Facebook is connected, I'll create this as a draft on your ad account after you confirm." : "This stays in demo until you connect Facebook in Settings — same controls, no real spend."}`,
    needsConfirm: true,
    confirmReason: confirm
      ? `${money(daily)}/day is a serious budget. Confirm to create the ad.`
      : "Creating a new ad is a real change. Confirm and I'll set it up.",
    actions: [
      {
        type: "create_campaign",
        campaign: {
          name,
          business,
          objective,
          status: "active",
          dailyBudget: daily,
          targeting,
          placements,
          ad,
        },
      },
    ],
    suggestions: suggestionsFor("create"),
  };
}

function buildOptimize(ctx: CoachContext): CoachResult {
  const losers = ctx.campaigns.filter(isUnderperforming);
  const winners = ctx.campaigns.filter(isWinning);
  if (!losers.length && !winners.length) {
    return {
      reply: `Nothing looks like a dumpster fire. ${coachTake(ctx.campaigns)} If you want, I can still tighten targeting or cut spend.`,
      needsConfirm: false,
      actions: [],
      suggestions: ["Cut spend by a third", "Only show ads locally"],
    };
  }
  const parts: string[] = [];
  if (losers.length) {
    parts.push(
      `I'd pause ${listNames(losers)}. ${losers.map((c) => `${c.name} has spent ${money(c.stats.spent)} for ${c.stats.results} ${c.stats.resultLabel}`).join(". ")}. That's not a good trade.`,
    );
  }
  if (winners.length) {
    parts.push(`I'd give ${listNames(winners)} about 15% more budget — it's actually working.`);
  }
  return {
    reply: `${parts.join(" ")} That's what a buyer would do at the end of the week: starve the losers, feed the winners.`,
    needsConfirm: true,
    confirmReason: "I'll pause weak ads and raise spend on the strong ones.",
    actions: [{ type: "optimize" }],
    suggestions: suggestionsFor("optimize"),
  };
}

function buildReport(ctx: CoachContext): CoachResult {
  const spent = ctx.campaigns.reduce((s, c) => s + c.stats.spent, 0);
  const daily = ctx.campaigns.filter((c) => c.status === "active").reduce((s, c) => s + c.dailyBudget, 0);
  const lines = ctx.campaigns.map((c) => {
    const tag = c.status === "active" ? "on" : c.status;
    return `• ${c.name} (${tag}): spent ${money(c.stats.spent)}, ${c.stats.results} ${c.stats.resultLabel}, ${c.stats.ctr.toFixed(1)}% of people who saw it clicked. Goal was ${objectiveCopy[c.objective].label.toLowerCase()}.`;
  });
  return {
    reply: `Lifetime in this account: ${money(spent)} spent. If nothing changes, today is paced at ${money(daily)}.\n\n${lines.join("\n")}\n\n${coachTake(ctx.campaigns)}${ctx.account.dailyCap ? ` Your safety cap is ${money(ctx.account.dailyCap)}/day.` : ""}`,
    needsConfirm: false,
    actions: [],
    suggestions: suggestionsFor("report"),
  };
}

export const actionSchemaForLlm = `{
  "reply": "plain English explanation for a non-expert",
  "needsConfirm": true,
  "confirmReason": "optional",
  "suggestions": ["short follow-up", "short follow-up"],
  "actions": [
    { "type": "create_campaign", "campaign": { "name": "", "business": "", "objective": "awareness|traffic|engagement|messages|leads|sales", "status": "active", "dailyBudget": 20, "targeting": { "locations": [], "ageMin": 25, "ageMax": 54, "gender": "all|women|men", "interests": [] }, "placements": ["automatic"], "ad": { "headline": "", "primaryText": "", "cta": "Learn more", "destinationUrl": "https://example.com", "visualLabel": "" } } },
    { "type": "pause", "campaignIds": ["id"] },
    { "type": "resume", "campaignIds": ["id"] },
    { "type": "update_budget", "campaignIds": ["id"], "dailyBudget": 20 },
    { "type": "update_targeting", "campaignIds": ["id"], "targeting": {} },
    { "type": "update_objective", "campaignIds": ["id"], "objective": "traffic" },
    { "type": "update_ad", "campaignIds": ["id"], "ad": {} },
    { "type": "update_placements", "campaignIds": ["id"], "placements": ["automatic"] },
    { "type": "optimize" },
    { "type": "set_account_cap", "dailyCap": 80 }
  ]
}

Rules:
- Speak like a calm senior media buyer. No Facebook jargon unless you immediately define it.
- Never delete ads. Pause instead.
- Confirm new campaigns and any daily budget >= 200 or more than 2x current.
- Use existing campaign ids when editing.
- If the user is vague, ask a short question and return no actions.
- If they describe a business and a budget, create a campaign.`;
