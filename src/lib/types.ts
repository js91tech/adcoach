export type Objective =
  | "awareness"
  | "traffic"
  | "engagement"
  | "messages"
  | "leads"
  | "sales";

export type CampaignStatus = "active" | "paused" | "draft";

export type Placement =
  | "automatic"
  | "facebook_feed"
  | "instagram_feed"
  | "stories"
  | "reels";

export type Gender = "all" | "women" | "men";

export type Targeting = {
  locations: string[];
  ageMin: number;
  ageMax: number;
  gender: Gender;
  interests: string[];
  customAudience?: string;
};

export type AdCreative = {
  headline: string;
  primaryText: string;
  cta: string;
  destinationUrl: string;
  visualLabel: string;
};

export type Campaign = {
  id: string;
  name: string;
  business: string;
  objective: Objective;
  status: CampaignStatus;
  dailyBudget: number;
  lifetimeBudget?: number;
  targeting: Targeting;
  placements: Placement[];
  ad: AdCreative;
  createdAt: string;
  metaCampaignId?: string;
  metaAdSetId?: string;
  stats: {
    spent: number;
    impressions: number;
    clicks: number;
    results: number;
    resultLabel: string;
    ctr: number;
    cpc: number;
    roas?: number;
  };
};

export type AccountSettings = {
  dailyCap: number | null;
  businessName: string;
  currency: string;
};

export type ConnectionState = {
  status: "demo" | "connected";
  configured: boolean;
  userName?: string;
  adAccountId?: string;
  adAccountName?: string;
  currency?: string;
  error?: string;
};

export type AdAccountOption = {
  id: string;
  name: string;
  currency: string;
  accountStatus: number;
};

export type ChatRole = "user" | "coach";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  needsConfirm?: boolean;
  confirmReason?: string;
  pendingActions?: CoachAction[];
  applied?: boolean;
  suggestions?: string[];
};

export type CoachAction =
  | { type: "create_campaign"; campaign: Omit<Campaign, "id" | "createdAt" | "stats"> & { stats?: Campaign["stats"] } }
  | { type: "pause"; campaignIds: string[] }
  | { type: "resume"; campaignIds: string[] }
  | { type: "update_budget"; campaignIds: string[]; dailyBudget?: number; lifetimeBudget?: number }
  | { type: "update_targeting"; campaignIds: string[]; targeting: Partial<Targeting> }
  | { type: "update_objective"; campaignIds: string[]; objective: Objective }
  | { type: "update_ad"; campaignIds: string[]; ad: Partial<AdCreative> }
  | { type: "update_placements"; campaignIds: string[]; placements: Placement[] }
  | { type: "optimize" }
  | { type: "set_account_cap"; dailyCap: number | null }
  | { type: "import_campaigns"; campaigns: Campaign[] };

export type CoachResult = {
  reply: string;
  needsConfirm: boolean;
  confirmReason?: string;
  actions: CoachAction[];
  suggestions: string[];
};

export type AppState = {
  campaigns: Campaign[];
  account: AccountSettings;
  messages: ChatMessage[];
};

export type CoachContext = {
  campaigns: Campaign[];
  account: AccountSettings;
  connection: ConnectionState;
};
