import type { AppState, Campaign } from "./types";

export const seedCampaigns: Campaign[] = [
  {
    id: "camp_bakery",
    name: "Harbor & Rye — weekday visits",
    business: "Harbor & Rye Bakery",
    objective: "traffic",
    status: "active",
    dailyBudget: 35,
    targeting: {
      locations: ["Tampa, FL"],
      ageMin: 25,
      ageMax: 54,
      gender: "all",
      interests: ["coffee", "bakeries", "brunch"],
    },
    placements: ["automatic"],
    ad: {
      headline: "Warm bread, still in the window",
      primaryText:
        "Harbor & Rye is pulling sourdough and cinnamon rolls all morning. Skip the chain coffee line — we're two blocks off Harbour Island.",
      cta: "Learn more",
      destinationUrl: "https://harborandrye.example/menu",
      visualLabel: "Bakery storefront at sunrise",
    },
    createdAt: "2026-07-02T12:00:00.000Z",
    stats: {
      spent: 412,
      impressions: 28400,
      clicks: 486,
      results: 486,
      resultLabel: "website visits",
      ctr: 1.71,
      cpc: 0.85,
    },
  },
  {
    id: "camp_workshop",
    name: "Saturday sourdough workshop",
    business: "Harbor & Rye Bakery",
    objective: "leads",
    status: "active",
    dailyBudget: 18,
    targeting: {
      locations: ["Tampa, FL", "St. Petersburg, FL"],
      ageMin: 28,
      ageMax: 65,
      gender: "all",
      interests: ["baking", "weekend workshops", "local events"],
    },
    placements: ["facebook_feed", "instagram_feed"],
    ad: {
      headline: "Learn the loaf this Saturday",
      primaryText:
        "Eight seats. One morning. You'll leave with a starter and a loaf you actually made. $65 includes flour, coffee, and the recipe card.",
      cta: "Sign up",
      destinationUrl: "https://harborandrye.example/workshop",
      visualLabel: "Hands folding dough on a wooden bench",
    },
    createdAt: "2026-08-01T12:00:00.000Z",
    stats: {
      spent: 94,
      impressions: 9100,
      clicks: 122,
      results: 14,
      resultLabel: "signups",
      ctr: 1.34,
      cpc: 0.77,
    },
  },
  {
    id: "camp_gifts",
    name: "Holiday gift boxes",
    business: "Harbor & Rye Bakery",
    objective: "sales",
    status: "paused",
    dailyBudget: 50,
    targeting: {
      locations: ["United States"],
      ageMin: 28,
      ageMax: 50,
      gender: "women",
      interests: ["gift boxes", "gourmet food", "holiday shopping"],
    },
    placements: ["automatic"],
    ad: {
      headline: "Ship the bakery to their door",
      primaryText:
        "Three-day gift boxes with cookies, jam, and a handwritten card. We thought this would fly. It didn't — paused until we fix the offer.",
      cta: "Shop now",
      destinationUrl: "https://harborandrye.example/gifts",
      visualLabel: "Tied bakery box with twine",
    },
    createdAt: "2025-11-12T12:00:00.000Z",
    stats: {
      spent: 1240,
      impressions: 91000,
      clicks: 410,
      results: 11,
      resultLabel: "purchases",
      ctr: 0.45,
      cpc: 3.02,
      roas: 0.62,
    },
  },
];

export const seedState: AppState = {
  campaigns: seedCampaigns,
  account: {
    dailyCap: 80,
    businessName: "Harbor & Rye Bakery",
    currency: "USD",
  },
  messages: [
    {
      id: "msg_welcome",
      role: "coach",
      text: "I'm your ad coach. I run the numbers the way a media buyer would — cost per result, click-through versus a typical local ad, and whether you've spent enough to trust the call.\n\nTry “show me the math,” “if I move $20 a day to the bakery, what happens?,” or just describe a new ad in plain English.",
      createdAt: new Date().toISOString(),
      suggestions: [
        "Show me the math",
        "If I move $20 a day from holiday ads to the bakery, what happens?",
        "Don't let me spend more than $60 a day",
      ],
    },
  ],
};
