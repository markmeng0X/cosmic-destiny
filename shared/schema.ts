import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, serial, real, vector, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
export * from "./models/chat";

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  nickname: varchar("nickname"),
  gender: varchar("gender"),
  birthDate: timestamp("birth_date"),
  birthTime: varchar("birth_time"),
  birthPlace: varchar("birth_place"),
  birthLatitude: real("birth_latitude"),
  birthLongitude: real("birth_longitude"),
  timezone: varchar("timezone"),
  preferredCulture: varchar("preferred_culture").default("china"),
  preferredLanguage: varchar("preferred_language").default("zh"),
  notificationEnabled: boolean("notification_enabled").default(true),
  notificationTime: varchar("notification_time").default("08:00"),
  ttclid: varchar("ttclid"),
  ttp: varchar("ttp"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const baziCharts = pgTable("bazi_charts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  yearStem: varchar("year_stem").notNull(),
  yearBranch: varchar("year_branch").notNull(),
  monthStem: varchar("month_stem").notNull(),
  monthBranch: varchar("month_branch").notNull(),
  dayStem: varchar("day_stem").notNull(),
  dayBranch: varchar("day_branch").notNull(),
  hourStem: varchar("hour_stem").notNull(),
  hourBranch: varchar("hour_branch").notNull(),
  yearTenGod: varchar("year_ten_god"),
  monthTenGod: varchar("month_ten_god"),
  hourTenGod: varchar("hour_ten_god"),
  fiveElements: jsonb("five_elements"),
  tenGods: jsonb("ten_gods"),
  bodyStrength: real("body_strength"),
  bodyStrengthLevel: varchar("body_strength_level"),
  destinyPattern: varchar("destiny_pattern"),
  destinyPatternDesc: text("destiny_pattern_desc"),
  unlockedGrandLuck: jsonb("unlocked_grand_luck"),
  unlockedYearlyFortunes: jsonb("unlocked_yearly_fortunes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const dailyFortunes = pgTable("daily_fortunes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: timestamp("date").notNull(),
  overallScore: integer("overall_score").notNull(),
  careerScore: integer("career_score").notNull(),
  careerDesc: text("career_desc"),
  loveScore: integer("love_score").notNull(),
  loveDesc: text("love_desc"),
  wealthScore: integer("wealth_score").notNull(),
  wealthDesc: text("wealth_desc"),
  healthScore: integer("health_score").notNull(),
  healthDesc: text("health_desc"),
  studyScore: integer("study_score").notNull(),
  studyDesc: text("study_desc"),
  hourlyFortunes: jsonb("hourly_fortunes"),
  recommendations: jsonb("recommendations"),
  insights: jsonb("insights"),
  aiInterpretation: text("ai_interpretation"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const divinations = pgTable("divinations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  question: text("question").notNull(),
  questionType: varchar("question_type"),
  divinationModel: varchar("divination_model").default("liuyao"),
  result: text("result"),
  keyPoints: jsonb("key_points"),
  advice: text("advice"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const matchings = pgTable("matchings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  partnerNickname: varchar("partner_nickname"),
  partnerGender: varchar("partner_gender"),
  partnerBirthDate: timestamp("partner_birth_date"),
  partnerBirthTime: varchar("partner_birth_time"),
  partnerBirthPlace: varchar("partner_birth_place"),
  partnerBaziChart: jsonb("partner_bazi_chart"),
  matchScore: integer("match_score"),
  matchConclusion: text("match_conclusion"),
  relationshipType: varchar("relationship_type"),
  dimensionAnalysis: jsonb("dimension_analysis"),
  culturalInterpretation: text("cultural_interpretation"),
  selectedCulture: varchar("selected_culture"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  tier: varchar("tier").notNull().default("free"),
  status: varchar("status").notNull().default("active"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: varchar("referrer_id").notNull(),
  referredId: varchar("referred_id"),
  referralCode: varchar("referral_code").notNull().unique(),
  status: varchar("status").default("pending"),
  rewardType: varchar("reward_type"),
  rewardAmount: integer("reward_amount"),
  rewardedAt: timestamp("rewarded_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const stardustAccounts = pgTable("stardust_accounts", {
  userId: varchar("user_id").primaryKey().notNull(),
  balance: integer("balance").notNull().default(0),
  totalEarned: integer("total_earned").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0),
  lastDailyCheckIn: timestamp("last_daily_check_in"),
  consecutiveCheckIns: integer("consecutive_check_ins").default(0),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const stardustLogs = pgTable("stardust_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  amount: integer("amount").notNull(),
  description: text("description"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name"),
  monthlyPrice: real("monthly_price").default(0),
  monthlyCreditQuota: integer("monthly_credit_quota").notNull().default(0),
  aiModelTier: varchar("ai_model_tier", { length: 50 }).default("gpt-4o-mini"),
  earningMultiplier: real("earning_multiplier").default(1.0),
  shopDiscount: real("shop_discount").default(1.0),
  badgeType: varchar("badge_type", { length: 50 }),
  features: jsonb("features"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  deviceType: varchar("device_type").notNull(),
  deviceName: varchar("device_name"),
  connectionStatus: varchar("connection_status").default("disconnected"),
  lastSyncAt: timestamp("last_sync_at"),
  pushSettings: jsonb("push_settings"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const pushHistory = pgTable("push_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  deviceId: integer("device_id"),
  contentType: varchar("content_type"),
  content: text("content"),
  pushedAt: timestamp("pushed_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: serial("id").primaryKey(),
  sourceFileId: varchar("source_file_id").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("knowledge_embedding_idx").using("ivfflat", table.embedding.op("vector_cosine_ops")),
]);

export const knowledgeFiles = pgTable("knowledge_files", {
  id: varchar("id").primaryKey(),
  filename: varchar("filename").notNull(),
  fileType: varchar("file_type").notNull(),
  fileSize: integer("file_size"),
  chunkCount: integer("chunk_count").default(0),
  status: varchar("status").default("processing"),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBaziChartSchema = createInsertSchema(baziCharts).omit({
  id: true,
  createdAt: true,
});

export const insertDailyFortuneSchema = createInsertSchema(dailyFortunes).omit({
  id: true,
  createdAt: true,
});

export const insertDivinationSchema = createInsertSchema(divinations).omit({
  id: true,
  createdAt: true,
});

export const insertMatchingSchema = createInsertSchema(matchings).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type BaziChart = typeof baziCharts.$inferSelect;
export type InsertBaziChart = z.infer<typeof insertBaziChartSchema>;
export type DailyFortune = typeof dailyFortunes.$inferSelect;
export type InsertDailyFortune = z.infer<typeof insertDailyFortuneSchema>;
export type Divination = typeof divinations.$inferSelect;
export type InsertDivination = z.infer<typeof insertDivinationSchema>;
export type Matching = typeof matchings.$inferSelect;
export type InsertMatching = z.infer<typeof insertMatchingSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type StardustAccount = typeof stardustAccounts.$inferSelect;
export type StardustLog = typeof stardustLogs.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type PushHistory = typeof pushHistory.$inferSelect;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type KnowledgeFile = typeof knowledgeFiles.$inferSelect;

export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id").notNull(),
  userId: varchar("user_id"),
  path: varchar("path").notNull(),
  referrer: varchar("referrer"),
  userAgent: text("user_agent"),
  ip: varchar("ip"),
  country: varchar("country"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertPageViewSchema = createInsertSchema(pageViews).omit({
  id: true,
  createdAt: true,
});

export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;

export const STARDUST_COSTS = {
  api_call_daily_fortune: 5,
  api_call_hourly_fortune: 10,
  api_call_ai_deep_query: 20,
  api_call_bazi_deep_read: 20,
  api_call_culture_switch: 15,
} as const;

export const STARDUST_REWARDS = {
  initial_free_gift: 200,
  check_in: 5,
  check_in_week_bonus: 50,
  referral_success: 200,
} as const;

export const SUBSCRIPTION_QUOTAS = {
  free: 0,
  pro: 1200,
  elite: 4000,
} as const;
