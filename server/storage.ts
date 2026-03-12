import { db } from "./db";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import {
  userProfiles,
  baziCharts,
  dailyFortunes,
  divinations,
  matchings,
  subscriptions,
  referrals,
  stardustAccounts,
  stardustLogs,
  devices,
  pushHistory,
  STARDUST_REWARDS,
  type UserProfile,
  type InsertUserProfile,
  type BaziChart,
  type InsertBaziChart,
  type DailyFortune,
  type InsertDailyFortune,
  type Divination,
  type InsertDivination,
  type Matching,
  type InsertMatching,
  type Subscription,
  type InsertSubscription,
  type Referral,
  type InsertReferral,
  type Device,
  type InsertDevice,
  type StardustAccount,
  type StardustLog,
  type PushHistory,
  type SubscriptionPlan,
  subscriptionPlans,
} from "@shared/schema";

export interface IStorage {
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  
  getBaziChart(userId: string): Promise<BaziChart | undefined>;
  createBaziChart(chart: InsertBaziChart): Promise<BaziChart>;
  updateBaziChartUnlocked(userId: string, data: { unlockedGrandLuck?: Record<string, string>; unlockedYearlyFortunes?: Record<string, string> }): Promise<void>;
  
  getDailyFortune(userId: string, date: Date): Promise<DailyFortune | undefined>;
  createDailyFortune(fortune: InsertDailyFortune): Promise<DailyFortune>;
  updateDailyFortuneHourly(id: number, hourlyFortunes: any[]): Promise<DailyFortune | undefined>;
  
  getDivinations(userId: string, limit?: number): Promise<Divination[]>;
  createDivination(divination: InsertDivination): Promise<Divination>;
  
  getMatchings(userId: string, limit?: number): Promise<Matching[]>;
  createMatching(matching: InsertMatching): Promise<Matching>;
  
  getSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(userId: string, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  getSubscriptionPlan(tierName: string): Promise<SubscriptionPlan | undefined>;
  
  getReferrals(userId: string): Promise<Referral[]>;
  getReferralByCode(code: string): Promise<Referral | undefined>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  updateReferral(id: number, referral: Partial<InsertReferral>): Promise<Referral | undefined>;
  
  getStardustAccount(userId: string): Promise<StardustAccount | undefined>;
  createStardustAccount(userId: string, initialBalance?: number): Promise<StardustAccount>;
  consumeStardust(userId: string, amount: number, actionType: string, description?: string): Promise<{ success: boolean; newBalance: number; error?: string }>;
  earnStardust(userId: string, amount: number, actionType: string, description?: string, expiresInDays?: number): Promise<StardustAccount>;
  getStardustLogs(userId: string, limit?: number): Promise<StardustLog[]>;
  hasCheckedInToday(userId: string): Promise<boolean>;
  
  getDevices(userId: string): Promise<Device[]>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device | undefined>;
  deleteDevice(id: number): Promise<void>;
  
  getPushHistory(userId: string, limit?: number): Promise<PushHistory[]>;
}

export class DatabaseStorage implements IStorage {
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }

  async updateUserProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [updated] = await db
      .update(userProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated;
  }

  async getBaziChart(userId: string): Promise<BaziChart | undefined> {
    const [chart] = await db
      .select()
      .from(baziCharts)
      .where(eq(baziCharts.userId, userId))
      .orderBy(desc(baziCharts.createdAt))
      .limit(1);
    return chart;
  }

  async createBaziChart(chart: InsertBaziChart): Promise<BaziChart> {
    const [created] = await db.insert(baziCharts).values(chart).returning();
    return created;
  }

  async updateBaziChartUnlocked(userId: string, data: { unlockedGrandLuck?: Record<string, string>; unlockedYearlyFortunes?: Record<string, string> }): Promise<void> {
    const chart = await this.getBaziChart(userId);
    if (!chart) return;
    
    const updateData: any = {};
    if (data.unlockedGrandLuck !== undefined) {
      updateData.unlockedGrandLuck = data.unlockedGrandLuck;
    }
    if (data.unlockedYearlyFortunes !== undefined) {
      updateData.unlockedYearlyFortunes = data.unlockedYearlyFortunes;
    }
    
    await db
      .update(baziCharts)
      .set(updateData)
      .where(eq(baziCharts.id, chart.id));
  }

  async getDailyFortune(userId: string, date: Date): Promise<DailyFortune | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [fortune] = await db
      .select()
      .from(dailyFortunes)
      .where(
        and(
          eq(dailyFortunes.userId, userId),
          sql`${dailyFortunes.date} >= ${startOfDay}`,
          sql`${dailyFortunes.date} <= ${endOfDay}`
        )
      );
    return fortune;
  }

  async createDailyFortune(fortune: InsertDailyFortune): Promise<DailyFortune> {
    const [created] = await db.insert(dailyFortunes).values(fortune).returning();
    return created;
  }
  
  async updateDailyFortuneHourly(id: number, hourlyFortunes: any[]): Promise<DailyFortune | undefined> {
    const [updated] = await db
      .update(dailyFortunes)
      .set({ hourlyFortunes })
      .where(eq(dailyFortunes.id, id))
      .returning();
    return updated;
  }

  async getDivinations(userId: string, limit = 20): Promise<Divination[]> {
    return db
      .select()
      .from(divinations)
      .where(eq(divinations.userId, userId))
      .orderBy(desc(divinations.createdAt))
      .limit(limit);
  }

  async createDivination(divination: InsertDivination): Promise<Divination> {
    const [created] = await db.insert(divinations).values(divination).returning();
    return created;
  }

  async getMatchings(userId: string, limit = 20): Promise<Matching[]> {
    return db
      .select()
      .from(matchings)
      .where(eq(matchings.userId, userId))
      .orderBy(desc(matchings.createdAt))
      .limit(limit);
  }

  async createMatching(matching: InsertMatching): Promise<Matching> {
    const [created] = await db.insert(matchings).values(matching).returning();
    return created;
  }

  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return sub;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [created] = await db.insert(subscriptions).values(subscription).returning();
    return created;
  }

  async updateSubscription(userId: string, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [updated] = await db
      .update(subscriptions)
      .set({ ...subscription, updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId))
      .returning();
    return updated;
  }

  async getSubscriptionPlan(tierName: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.name, tierName));
    return plan;
  }

  async getReferrals(userId: string): Promise<Referral[]> {
    return db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async getReferralByCode(code: string): Promise<Referral | undefined> {
    const [ref] = await db.select().from(referrals).where(eq(referrals.referralCode, code));
    return ref;
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [created] = await db.insert(referrals).values(referral).returning();
    return created;
  }

  async updateReferral(id: number, referral: Partial<InsertReferral>): Promise<Referral | undefined> {
    const [updated] = await db
      .update(referrals)
      .set(referral)
      .where(eq(referrals.id, id))
      .returning();
    return updated;
  }

  async getStardustAccount(userId: string): Promise<StardustAccount | undefined> {
    const [account] = await db.select().from(stardustAccounts).where(eq(stardustAccounts.userId, userId));
    return account;
  }

  async createStardustAccount(userId: string, initialBalance = 0): Promise<StardustAccount> {
    const [created] = await db
      .insert(stardustAccounts)
      .values({ 
        userId, 
        balance: initialBalance, 
        totalEarned: initialBalance, 
        totalSpent: 0 
      })
      .returning();
    
    if (initialBalance > 0) {
      await db.insert(stardustLogs).values({
        userId,
        actionType: 'initial_free_gift',
        amount: initialBalance,
        description: '注册赠送星尘',
      });
    }
    
    return created;
  }

  async consumeStardust(userId: string, amount: number, actionType: string, description?: string): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const account = await this.getStardustAccount(userId);
    
    if (!account) {
      return { success: false, newBalance: 0, error: '账户不存在' };
    }
    
    if (account.balance < amount) {
      return { success: false, newBalance: account.balance, error: '星尘余额不足' };
    }
    
    const newBalance = account.balance - amount;
    const newTotalSpent = account.totalSpent + amount;
    
    await db
      .update(stardustAccounts)
      .set({ 
        balance: newBalance, 
        totalSpent: newTotalSpent,
        updatedAt: new Date() 
      })
      .where(eq(stardustAccounts.userId, userId));
    
    await db.insert(stardustLogs).values({
      userId,
      actionType,
      amount: -amount,
      description,
    });
    
    return { success: true, newBalance };
  }

  async earnStardust(userId: string, amount: number, actionType: string, description?: string, expiresInDays?: number): Promise<StardustAccount> {
    let account = await this.getStardustAccount(userId);
    
    if (!account) {
      account = await this.createStardustAccount(userId, 0);
    }
    
    const newBalance = account.balance + amount;
    const newTotalEarned = account.totalEarned + amount;
    
    const updateData: Partial<StardustAccount> = {
      balance: newBalance,
      totalEarned: newTotalEarned,
      updatedAt: new Date(),
    };
    
    if (actionType === 'check_in') {
      updateData.lastDailyCheckIn = new Date();
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const lastCheckIn = account.lastDailyCheckIn ? new Date(account.lastDailyCheckIn) : null;
      if (lastCheckIn) {
        lastCheckIn.setHours(0, 0, 0, 0);
      }
      
      const isConsecutive = lastCheckIn && lastCheckIn.getTime() === yesterday.getTime();
      updateData.consecutiveCheckIns = isConsecutive ? (account.consecutiveCheckIns || 0) + 1 : 1;
    }
    
    const [updated] = await db
      .update(stardustAccounts)
      .set(updateData)
      .where(eq(stardustAccounts.userId, userId))
      .returning();
    
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : undefined;
    
    await db.insert(stardustLogs).values({
      userId,
      actionType,
      amount,
      description,
      expiresAt,
    });
    
    return updated;
  }

  async getStardustLogs(userId: string, limit = 50): Promise<StardustLog[]> {
    return db
      .select()
      .from(stardustLogs)
      .where(eq(stardustLogs.userId, userId))
      .orderBy(desc(stardustLogs.createdAt))
      .limit(limit);
  }

  async hasCheckedInToday(userId: string): Promise<boolean> {
    const account = await this.getStardustAccount(userId);
    if (!account || !account.lastDailyCheckIn) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastCheckIn = new Date(account.lastDailyCheckIn);
    lastCheckIn.setHours(0, 0, 0, 0);
    
    return lastCheckIn.getTime() === today.getTime();
  }

  async getDevices(userId: string): Promise<Device[]> {
    return db
      .select()
      .from(devices)
      .where(eq(devices.userId, userId))
      .orderBy(desc(devices.createdAt));
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const [created] = await db.insert(devices).values(device).returning();
    return created;
  }

  async updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device | undefined> {
    const [updated] = await db
      .update(devices)
      .set(device)
      .where(eq(devices.id, id))
      .returning();
    return updated;
  }

  async deleteDevice(id: number): Promise<void> {
    await db.delete(devices).where(eq(devices.id, id));
  }

  async getPushHistory(userId: string, limit = 50): Promise<PushHistory[]> {
    return db
      .select()
      .from(pushHistory)
      .where(eq(pushHistory.userId, userId))
      .orderBy(desc(pushHistory.pushedAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
