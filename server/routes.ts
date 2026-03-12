import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated, setupAuth } from "./replit_integrations/auth/replitAuth";
import { calculateBazi, getHourBranchFromTime } from "./lib/bazi-calculator";
import { generateDailyFortune, generateDivination, generateMatchingAnalysis, generateCulturalInterpretation, generateDeepReading, generateMultiLangDeepReading, translateContent, translateDivinationResponse, translateBaziInterpretation, translateTexts, fastTranslate, type MultiLangInterpretation } from "./lib/fortune-generator";
import type { BaziResult } from "./lib/bazi-calculator";
import { randomUUID } from "crypto";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import multer from "multer";
import { storeKnowledgeFile, clearAllKnowledge, getKnowledgeStatus, searchKnowledge } from "./lib/knowledge-service";
import { trackCompleteRegistration, trackLogin, trackPurchase, trackPlaceAnOrder, trackInitiateCheckout, trackAddPaymentInfo, trackViewContent, trackServerEvent } from "./lib/tiktok-events";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication routes (login, callback, logout)
  await setupAuth(app);
  
  // IP-based language detection endpoint
  app.get("/api/detect-language", async (req: Request, res: Response) => {
    try {
      const userAgent = req.headers["user-agent"] || "";
      const isBot = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|embedly|showyoubot|outbrain|pinterest|applebot|semrushbot|ahrefsbot/i.test(userAgent);

      if (isBot) {
        return res.json({ language: "en", countryCode: "", bot: true });
      }

      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() 
        || req.headers["x-real-ip"]?.toString()
        || req.socket.remoteAddress 
        || "";
      
      const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
      const geoData = await geoResponse.json() as { countryCode?: string };
      
      const countryCode = geoData.countryCode || "";
      
      let language: "zh" | "en" | "ja" | "ko" = "en";
      
      if (countryCode === "CN" || countryCode === "TW" || countryCode === "HK" || countryCode === "MO") {
        language = "zh";
      } else if (countryCode === "JP") {
        language = "ja";
      } else if (countryCode === "KR") {
        language = "ko";
      }
      
      res.json({ language, countryCode, ip: ip.substring(0, 10) + "..." });
    } catch (error) {
      console.error("Error detecting language from IP:", error);
      res.json({ language: "en", countryCode: "", error: "Detection failed" });
    }
  });
  
  // User info endpoint - uses isAuthenticated middleware for proper token refresh
  app.get("/api/auth/user", isAuthenticated, async (req: any, res: Response) => {
    const claims = req.user?.claims;
    if (!claims) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Return normalized user object matching shared User model
    res.json({
      id: claims.sub,
      email: claims.email,
      firstName: claims.first_name,
      lastName: claims.last_name,
      profileImageUrl: claims.profile_image_url,
    });
  });
  
  app.get("/api/profile", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getUserProfile(userId);
      
      if (!profile) {
        profile = await storage.createUserProfile({
          userId,
          nickname: req.user.claims.name || null,
          preferredCulture: "china",
          preferredLanguage: "zh",
        });
        
        await storage.createStardustAccount(userId, 200);
        
        await storage.createSubscription({
          userId,
          tier: "free",
          status: "active",
        });
        
        const referralCode = userId.slice(0, 8).toUpperCase();
        await storage.createReferral({
          referrerId: userId,
          referralCode,
        });
        
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });
  
  app.put("/api/profile", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = { ...req.body };
      
      if (profileData.birthDate && typeof profileData.birthDate === 'string') {
        profileData.birthDate = new Date(profileData.birthDate);
      }
      
      const updated = await storage.updateUserProfile(userId, profileData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  app.post("/api/track/pageview", async (req: Request, res: Response) => {
    try {
      const { pool } = await import("./db");
      const { sessionId, path, referrer, userId } = req.body;
      if (!sessionId || !path) {
        return res.status(400).json({ message: "sessionId and path required" });
      }
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
        || req.headers["x-real-ip"]?.toString()
        || req.socket.remoteAddress || "";
      const userAgent = req.headers["user-agent"] || "";

      await pool.query(
        `INSERT INTO page_views (session_id, user_id, path, referrer, user_agent, ip) VALUES ($1, $2, $3, $4, $5, $6)`,
        [sessionId, userId || null, path, referrer || null, userAgent, ip]
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking pageview:", error);
      res.status(500).json({ message: "Failed to track pageview" });
    }
  });

  app.post("/api/track/ttclid", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { ttclid, ttp } = req.body;
      if (ttclid || ttp) {
        const updateData: Record<string, string> = {};
        if (ttclid) updateData.ttclid = ttclid;
        if (ttp) updateData.ttp = ttp;
        await storage.updateUserProfile(userId, updateData as any);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving ttclid:", error);
      res.status(500).json({ message: "Failed to save ttclid" });
    }
  });

  app.get("/api/bazi-chart", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const chart = await storage.getBaziChart(userId);
      const profile = await storage.getUserProfile(userId);
      
      if (!chart) {
        return res.status(404).json({ message: "No BaZi chart found. Please calculate first." });
      }
      
      if (profile?.birthDate && profile?.birthTime) {
        const date = new Date(profile.birthDate);
        const hour = getHourBranchFromTime(profile.birthTime);
        const fullResult = calculateBazi(date, hour, profile.gender || "male");
        
        res.json({
          ...chart,
          yearPillar: fullResult.yearPillar,
          monthPillar: fullResult.monthPillar,
          dayPillar: fullResult.dayPillar,
          hourPillar: fullResult.hourPillar,
          dayMasterElement: fullResult.dayMasterElement,
          dayMasterPolarity: fullResult.dayMasterPolarity,
          dayMasterElementDesc: fullResult.dayMasterElementDesc,
          favorableGod: fullResult.favorableGod,
          favorableGodDesc: fullResult.favorableGodDesc,
          avoidGod: fullResult.avoidGod,
          avoidGodDesc: fullResult.avoidGodDesc,
          grandLuck: fullResult.grandLuck,
          yearlyFortunes: fullResult.yearlyFortunes,
          bodyStrengthDesc: fullResult.bodyStrengthDesc,
          birthYear: fullResult.birthYear,
          gender: fullResult.gender,
        });
      } else {
        res.json(chart);
      }
    } catch (error) {
      console.error("Error fetching BaZi chart:", error);
      res.status(500).json({ message: "Failed to fetch BaZi chart" });
    }
  });
  
  app.post("/api/bazi-chart/calculate", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { birthDate, birthTime, birthPlace, gender } = req.body;
      
      if (!birthDate) {
        return res.status(400).json({ message: "请选择出生日期 / Please select birth date" });
      }
      if (!birthTime) {
        return res.status(400).json({ message: "请选择出生时辰 / Please select birth time" });
      }
      if (!birthPlace) {
        return res.status(400).json({ message: "请输入出生地点 / Please enter birth place" });
      }
      if (!gender) {
        return res.status(400).json({ message: "请选择性别 / Please select gender" });
      }
      
      const date = new Date(birthDate);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "出生日期格式无效 / Invalid birth date format" });
      }
      
      const hour = getHourBranchFromTime(birthTime);
      const baziResult = calculateBazi(date, hour, gender);
      
      await storage.updateUserProfile(userId, {
        birthDate: date,
        birthTime,
        birthPlace,
        gender,
      });
      
      const chart = await storage.createBaziChart({
        userId,
        ...baziResult,
      });
      
      res.json(chart);
    } catch (error) {
      console.error("Error calculating BaZi:", error);
      res.status(500).json({ message: "八字计算失败，请稍后重试 / Failed to calculate BaZi chart" });
    }
  });
  
  app.post("/api/bazi-chart/cultural-interpretation", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { culture, selectedYear, language } = req.body;
      
      if (!culture || culture === "none") {
        return res.status(400).json({ message: "Please select a cultural system" });
      }
      
      const subscription = await storage.getSubscription(userId);
      if (!subscription || subscription.tier === "free") {
        return res.status(403).json({ 
          message: "切换文化解读功能仅限付费会员使用，请升级订阅方案",
          upgradeRequired: true,
        });
      }
      
      const consumeResult = await storage.consumeStardust(userId, 15, 'api_call_culture_switch', '切换文化解读');
      if (!consumeResult.success) {
        return res.status(402).json({ 
          message: "星尘余额不足", 
          currentBalance: consumeResult.newBalance,
          required: 15,
        });
      }
      
      const chart = await storage.getBaziChart(userId);
      const profile = await storage.getUserProfile(userId);
      
      if (!chart || !profile || !profile.birthDate || !profile.birthTime) {
        return res.status(404).json({ message: "BaZi chart not found. Please calculate your chart first." });
      }
      
      const date = new Date(profile.birthDate);
      const hour = getHourBranchFromTime(profile.birthTime);
      const baziResult = calculateBazi(date, hour, profile.gender || "male");
      
      const interpretation = await generateCulturalInterpretation(
        baziResult,
        culture,
        selectedYear || new Date().getFullYear(),
        language || "zh"
      );
      
      res.json(interpretation);
    } catch (error) {
      console.error("Error generating cultural interpretation:", error);
      res.status(500).json({ message: "Failed to generate cultural interpretation" });
    }
  });

  app.get("/api/daily-fortune", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const fortune = await storage.getDailyFortune(userId, today);
      
      // Return existing fortune or null (frontend will show generate button)
      res.json(fortune || null);
    } catch (error) {
      console.error("Error fetching daily fortune:", error);
      res.status(500).json({ message: "Failed to fetch daily fortune" });
    }
  });
  
  app.post("/api/daily-fortune/generate", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { language } = req.body;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingFortune = await storage.getDailyFortune(userId, today);
      if (existingFortune) {
        return res.status(400).json({ message: "今日运势已生成，每天只能生成一次" });
      }
      
      const consumeResult = await storage.consumeStardust(userId, 5, 'api_call_daily_fortune', '生成每日运势');
      if (!consumeResult.success) {
        return res.status(402).json({ 
          message: "星尘余额不足", 
          currentBalance: consumeResult.newBalance,
          required: 5,
        });
      }
      
      const chart = await storage.getBaziChart(userId);
      const profile = await storage.getUserProfile(userId);
      
      if (!chart) {
        return res.status(404).json({ message: "请先完善出生信息" });
      }
      
      const baziResult: BaziResult = {
        yearStem: chart.yearStem,
        yearBranch: chart.yearBranch,
        monthStem: chart.monthStem,
        monthBranch: chart.monthBranch,
        dayStem: chart.dayStem,
        dayBranch: chart.dayBranch,
        hourStem: chart.hourStem,
        hourBranch: chart.hourBranch,
        yearTenGod: chart.yearTenGod || "",
        monthTenGod: chart.monthTenGod || "",
        hourTenGod: chart.hourTenGod || "",
        fiveElements: (chart.fiveElements as Record<string, number>) || {},
        tenGods: (chart.tenGods as Record<string, number>) || {},
        bodyStrength: chart.bodyStrength || 5,
        bodyStrengthLevel: chart.bodyStrengthLevel || "身中和",
        destinyPattern: chart.destinyPattern || "正官格",
        destinyPatternDesc: chart.destinyPatternDesc || "",
      };
      
      const result = await generateDailyFortune(
        baziResult,
        today,
        profile?.preferredCulture || "china",
        language || profile?.preferredLanguage || "zh"
      );
      
      const fortune = await storage.createDailyFortune({
        userId,
        date: today,
        overallScore: result.overallScore,
        careerScore: result.career.score,
        careerDesc: result.career.desc,
        loveScore: result.love.score,
        loveDesc: result.love.desc,
        wealthScore: result.wealth.score,
        wealthDesc: result.wealth.desc,
        healthScore: result.health.score,
        healthDesc: result.health.desc,
        studyScore: result.study.score,
        studyDesc: result.study.desc,
        hourlyFortunes: result.hourlyFortunes,
        recommendations: result.recommendations,
        insights: result.insights,
        aiInterpretation: result.aiInterpretation,
      });
      
      res.json({ ...fortune, newBalance: consumeResult.newBalance });
    } catch (error) {
      console.error("Error generating daily fortune:", error);
      res.status(500).json({ message: "Failed to generate daily fortune" });
    }
  });
  
  app.post("/api/hourly-fortune/generate", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { language } = req.body;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingFortune = await storage.getDailyFortune(userId, today);
      if (existingFortune && existingFortune.hourlyFortunes && Array.isArray(existingFortune.hourlyFortunes) && existingFortune.hourlyFortunes.length > 0) {
        return res.status(400).json({ message: "今日时辰运势已生成，每天只能生成一次" });
      }
      
      const consumeResult = await storage.consumeStardust(userId, 10, 'api_call_hourly_fortune', '生成十二时辰运势');
      if (!consumeResult.success) {
        return res.status(402).json({ 
          message: "星尘余额不足", 
          currentBalance: consumeResult.newBalance,
          required: 10,
        });
      }
      
      const profile = await storage.getUserProfile(userId);
      const chart = await storage.getBaziChart(userId);
      
      if (!chart) {
        return res.status(404).json({ message: "请先完善出生信息" });
      }
      
      const lang = language || profile?.preferredLanguage || "zh";
      const hourBranches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
      const favorableI18n: Record<string, string[]> = {
        zh: ["创作", "签约", "谈判", "投资", "学习", "沟通", "休息", "运动"],
        en: ["Creative work", "Signing contracts", "Negotiations", "Investments", "Study", "Communication", "Rest", "Exercise"],
        ja: ["創作", "契約", "交渉", "投資", "学習", "コミュニケーション", "休息", "運動"],
        ko: ["창작", "계약", "협상", "투자", "학습", "소통", "휴식", "운동"],
      };
      const unfavorableI18n: Record<string, string[]> = {
        zh: ["冲动决策", "远行", "大额消费", "争执", "熬夜", "冒险", "借贷", "签约"],
        en: ["Impulsive decisions", "Long travel", "Major spending", "Arguments", "Staying up late", "Taking risks", "Borrowing", "Signing"],
        ja: ["衝動的な決定", "長距離移動", "大きな支出", "口論", "夜更かし", "冒険", "借入", "契約"],
        ko: ["충동적 결정", "장거리 여행", "큰 소비", "논쟁", "밤샘", "모험", "대출", "계약"],
      };
      const favorableOptions = favorableI18n[lang] || favorableI18n.zh;
      const unfavorableOptions = unfavorableI18n[lang] || unfavorableI18n.zh;
      
      const hourlyFortunes = hourBranches.map((branch) => ({
        hour: branch,
        score: Math.floor(Math.random() * 40) + 60,
        favorable: favorableOptions[Math.floor(Math.random() * favorableOptions.length)],
        unfavorable: unfavorableOptions[Math.floor(Math.random() * unfavorableOptions.length)],
      }));
      
      if (existingFortune) {
        await storage.updateDailyFortuneHourly(existingFortune.id, hourlyFortunes);
      }
      
      res.json({ hourlyFortunes, newBalance: consumeResult.newBalance });
    } catch (error) {
      console.error("Error generating hourly fortune:", error);
      res.status(500).json({ message: "Failed to generate hourly fortune" });
    }
  });
  
  app.post("/api/bazi-chart/deep-reading", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { type, data, language, culture } = req.body;
      
      const subscription = await storage.getSubscription(userId);
      if (!subscription || subscription.tier === "free") {
        return res.status(403).json({ 
          message: "八字深度解读功能仅限付费会员使用，请升级订阅方案",
          upgradeRequired: true,
        });
      }
      
      const consumeResult = await storage.consumeStardust(userId, 20, 'api_call_bazi_deep_read', `${type === 'grandLuck' ? '大运' : '流年'}深度解读`);
      if (!consumeResult.success) {
        return res.status(402).json({ 
          message: "星尘余额不足", 
          currentBalance: consumeResult.newBalance,
          required: 20,
        });
      }
      
      const chart = await storage.getBaziChart(userId);
      const profile = await storage.getUserProfile(userId);
      
      if (!chart || !profile || !profile.birthDate || !profile.birthTime) {
        return res.status(404).json({ message: "请先完善出生信息" });
      }
      
      const date = new Date(profile.birthDate);
      const hour = getHourBranchFromTime(profile.birthTime);
      const baziResult = calculateBazi(date, hour, profile.gender || "male");
      
      const langCode = language || profile?.preferredLanguage || "zh";
      const selectedCulture = culture || "none";
      
      let interpretation = "";
      let dataKey = "";
      
      // Use AI to generate deep reading with culture support
      try {
        interpretation = await generateDeepReading(baziResult, type, data, langCode, selectedCulture, subscription.tier);
      } catch (aiError) {
        console.error("AI deep reading error:", aiError);
      }
      
      // Fallback to basic interpretation if AI returned empty or failed
      if (!interpretation) {
        console.warn(`AI returned empty interpretation for ${type}, using fallback`);
        const stemToElement: Record<string, string> = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
        const element = stemToElement[data.stem as string] || "未知";
        if (type === "grandLuck") {
          interpretation = `大运${data.stem}${data.branch}（${data.startAge}-${data.endAge}岁）：此大运阶段天干属${element}，运势整体向好，宜把握机遇稳步发展。`;
        } else {
          interpretation = `${data.year}年流年${data.stem}${data.branch}：天干属${element}，此年运势平稳，需注意调整方向，把握时机。`;
        }
      }
      
      if (type === "grandLuck" && data) {
        dataKey = `${data.startAge}-${data.endAge}`;
      } else if (type === "yearlyFortune" && data) {
        dataKey = String(data.year);
      }
      
      // Save to database for persistence
      if (chart && interpretation) {
        try {
          if (type === "grandLuck") {
            const existing = (chart.unlockedGrandLuck as Record<string, string>) || {};
            existing[dataKey] = interpretation;
            await storage.updateBaziChartUnlocked(userId, { unlockedGrandLuck: existing });
          } else if (type === "yearlyFortune") {
            const existing = (chart.unlockedYearlyFortunes as Record<string, string>) || {};
            existing[dataKey] = interpretation;
            await storage.updateBaziChartUnlocked(userId, { unlockedYearlyFortunes: existing });
          }
        } catch (saveError) {
          console.error("Error saving unlocked interpretation:", saveError);
        }
      }
      
      res.json({ 
        type,
        interpretation,
        dataKey,
        newBalance: consumeResult.newBalance,
      });
    } catch (error) {
      console.error("Error generating deep reading:", error);
      res.status(500).json({ message: "Failed to generate deep reading" });
    }
  });
  
  // Multi-language deep reading endpoint - returns all 4 languages for instant switching
  app.post("/api/bazi-chart/deep-reading-multilang", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { type, data, culture } = req.body;
      
      const subscription = await storage.getSubscription(userId);
      if (!subscription || subscription.tier === "free") {
        return res.status(403).json({ 
          message: "八字深度解读功能仅限付费会员使用，请升级订阅方案",
          upgradeRequired: true,
        });
      }
      
      const consumeResult = await storage.consumeStardust(userId, 20, 'api_call_bazi_deep_read', `${type === 'grandLuck' ? '大运' : '流年'}深度解读`);
      if (!consumeResult.success) {
        return res.status(402).json({ 
          message: "星尘余额不足", 
          currentBalance: consumeResult.newBalance,
          required: 20,
        });
      }
      
      const chart = await storage.getBaziChart(userId);
      const profile = await storage.getUserProfile(userId);
      
      if (!chart || !profile || !profile.birthDate || !profile.birthTime) {
        return res.status(404).json({ message: "请先完善出生信息" });
      }
      
      const date = new Date(profile.birthDate);
      const hour = getHourBranchFromTime(profile.birthTime);
      const baziResult = calculateBazi(date, hour, profile.gender || "male");
      
      const selectedCulture = culture || "none";
      
      // Generate all 4 language versions at once
      const multiLangInterpretation = await generateMultiLangDeepReading(
        baziResult, type, data, selectedCulture, subscription.tier
      );
      
      let dataKey = "";
      if (type === "grandLuck" && data) {
        dataKey = `${data.startAge}-${data.endAge}`;
      } else if (type === "yearlyFortune" && data) {
        dataKey = String(data.year);
      }
      
      // Save all language versions to database
      if (chart && multiLangInterpretation.zh) {
        try {
          if (type === "grandLuck") {
            const existing = (chart.unlockedGrandLuck as Record<string, any>) || {};
            existing[dataKey] = multiLangInterpretation;
            await storage.updateBaziChartUnlocked(userId, { unlockedGrandLuck: existing });
          } else if (type === "yearlyFortune") {
            const existing = (chart.unlockedYearlyFortunes as Record<string, any>) || {};
            existing[dataKey] = multiLangInterpretation;
            await storage.updateBaziChartUnlocked(userId, { unlockedYearlyFortunes: existing });
          }
        } catch (saveError) {
          console.error("Error saving multilang interpretation:", saveError);
        }
      }
      
      res.json({ 
        type,
        interpretation: multiLangInterpretation,
        dataKey,
        newBalance: consumeResult.newBalance,
      });
    } catch (error) {
      console.error("Error generating multi-lang deep reading:", error);
      res.status(500).json({ message: "Failed to generate deep reading" });
    }
  });
  
  app.get("/api/divinations", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const divinations = await storage.getDivinations(userId);
      res.json(divinations);
    } catch (error) {
      console.error("Error fetching divinations:", error);
      res.status(500).json({ message: "Failed to fetch divinations" });
    }
  });
  
  app.post("/api/divinations", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { question, questionType, culture, divinationModel, language } = req.body;
      
      if (!question) {
        return res.status(400).json({ message: "Question is required" });
      }
      
      const chart = await storage.getBaziChart(userId);
      const profile = await storage.getUserProfile(userId);
      
      const baziResult: BaziResult = chart ? {
        yearStem: chart.yearStem,
        yearBranch: chart.yearBranch,
        monthStem: chart.monthStem,
        monthBranch: chart.monthBranch,
        dayStem: chart.dayStem,
        dayBranch: chart.dayBranch,
        hourStem: chart.hourStem,
        hourBranch: chart.hourBranch,
        yearTenGod: chart.yearTenGod || "",
        monthTenGod: chart.monthTenGod || "",
        hourTenGod: chart.hourTenGod || "",
        fiveElements: (chart.fiveElements as Record<string, number>) || {},
        tenGods: (chart.tenGods as Record<string, number>) || {},
        bodyStrength: chart.bodyStrength || 5,
        bodyStrengthLevel: chart.bodyStrengthLevel || "身中和",
        destinyPattern: chart.destinyPattern || "正官格",
        destinyPatternDesc: chart.destinyPatternDesc || "",
      } : {
        yearStem: "甲", yearBranch: "子", monthStem: "丙", monthBranch: "寅",
        dayStem: "庚", dayBranch: "午", hourStem: "壬", hourBranch: "申",
        yearTenGod: "偏财", monthTenGod: "七杀", hourTenGod: "食神",
        fiveElements: {}, tenGods: {}, bodyStrength: 5,
        bodyStrengthLevel: "身中和", destinyPattern: "正官格", destinyPatternDesc: "",
      };
      
      const result = await generateDivination(question, questionType, baziResult, culture || "none", divinationModel || "liuyao", language || profile?.preferredLanguage || "zh");
      
      const divination = await storage.createDivination({
        userId,
        question,
        questionType,
        divinationModel: "liuyao",
        result: result.result,
        keyPoints: result.keyPoints,
        advice: result.advice,
      });
      
      res.json(divination);
    } catch (error) {
      console.error("Error creating divination:", error);
      res.status(500).json({ message: "Failed to create divination" });
    }
  });
  
  app.get("/api/matchings", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const matchings = await storage.getMatchings(userId);
      res.json(matchings);
    } catch (error) {
      console.error("Error fetching matchings:", error);
      res.status(500).json({ message: "Failed to fetch matchings" });
    }
  });
  
  app.post("/api/matchings", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const {
        partnerNickname,
        partnerGender,
        partnerBirthDate,
        partnerBirthTime,
        partnerBirthPlace,
        relationshipType,
        selectedCulture,
        language,
      } = req.body;
      
      if (!partnerBirthDate || !partnerBirthTime) {
        return res.status(400).json({ message: "Partner birth info is required" });
      }
      
      const profile = await storage.getUserProfile(userId);
      const consumeResult = await storage.consumeStardust(userId, 20, 'api_call_compatibility_reading', '八字合盘分析');
      if (!consumeResult.success) {
        return res.status(402).json({ 
          message: "星尘余额不足", 
          currentBalance: consumeResult.newBalance,
          required: 20,
        });
      }
      
      const userChart = await storage.getBaziChart(userId);
      
      const partnerDate = new Date(partnerBirthDate);
      const partnerHour = getHourBranchFromTime(partnerBirthTime);
      const partnerBazi = calculateBazi(partnerDate, partnerHour);
      
      const userBazi: BaziResult = userChart ? {
        yearStem: userChart.yearStem,
        yearBranch: userChart.yearBranch,
        monthStem: userChart.monthStem,
        monthBranch: userChart.monthBranch,
        dayStem: userChart.dayStem,
        dayBranch: userChart.dayBranch,
        hourStem: userChart.hourStem,
        hourBranch: userChart.hourBranch,
        yearTenGod: userChart.yearTenGod || "",
        monthTenGod: userChart.monthTenGod || "",
        hourTenGod: userChart.hourTenGod || "",
        fiveElements: (userChart.fiveElements as Record<string, number>) || {},
        tenGods: (userChart.tenGods as Record<string, number>) || {},
        bodyStrength: userChart.bodyStrength || 5,
        bodyStrengthLevel: userChart.bodyStrengthLevel || "身中和",
        destinyPattern: userChart.destinyPattern || "正官格",
        destinyPatternDesc: userChart.destinyPatternDesc || "",
      } : partnerBazi;
      
      const result = await generateMatchingAnalysis(
        userBazi,
        partnerBazi,
        relationshipType || "romantic",
        selectedCulture || "china",
        language || profile?.preferredLanguage || "zh"
      );
      
      const matching = await storage.createMatching({
        userId,
        partnerNickname,
        partnerGender,
        partnerBirthDate: partnerDate,
        partnerBirthTime,
        partnerBirthPlace,
        partnerBaziChart: partnerBazi,
        matchScore: result.matchScore,
        matchConclusion: result.matchConclusion,
        relationshipType,
        dimensionAnalysis: result.dimensionAnalysis,
        culturalInterpretation: result.culturalInterpretation,
        selectedCulture,
      });
      
      res.json(matching);
    } catch (error) {
      console.error("Error creating matching:", error);
      res.status(500).json({ message: "Failed to create matching" });
    }
  });
  
  app.get("/api/subscription", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      let subscription = await storage.getSubscription(userId);
      
      if (!subscription) {
        subscription = await storage.createSubscription({
          userId,
          tier: "free",
          status: "active",
        });
      }
      
      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });
  
  app.get("/api/stardust", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      let account = await storage.getStardustAccount(userId);
      
      if (!account) {
        account = await storage.createStardustAccount(userId, 200);
      }
      
      const hasCheckedIn = await storage.hasCheckedInToday(userId);
      
      res.json({
        ...account,
        points: account.balance,
        hasCheckedInToday: hasCheckedIn,
      });
    } catch (error) {
      console.error("Error fetching stardust:", error);
      res.status(500).json({ message: "Failed to fetch stardust points" });
    }
  });
  
  app.get("/api/stardust/logs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getStardustLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching stardust logs:", error);
      res.status(500).json({ message: "Failed to fetch stardust logs" });
    }
  });
  
  app.post("/api/stardust/consume", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { actionType, requiredAmount, description } = req.body;
      
      if (!actionType || !requiredAmount) {
        return res.status(400).json({ message: "actionType and requiredAmount are required" });
      }
      
      const validActions = [
        'api_call_daily_fortune',
        'api_call_hourly_fortune', 
        'api_call_ai_deep_query',
        'api_call_bazi_deep_read',
        'api_call_culture_switch',
      ];
      
      if (!validActions.includes(actionType)) {
        return res.status(400).json({ message: "Invalid action type" });
      }
      
      const result = await storage.consumeStardust(userId, requiredAmount, actionType, description);
      
      if (!result.success) {
        return res.status(402).json({ 
          message: result.error || "Insufficient stardust balance",
          currentBalance: result.newBalance,
          required: requiredAmount,
        });
      }
      
      res.json({ 
        success: true, 
        newBalance: result.newBalance,
        consumed: requiredAmount,
      });
    } catch (error) {
      console.error("Error consuming stardust:", error);
      res.status(500).json({ message: "Failed to consume stardust" });
    }
  });
  
  app.post("/api/stardust/earn", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { actionType, amount, description, expiresInDays } = req.body;
      
      if (!actionType || !amount) {
        return res.status(400).json({ message: "actionType and amount are required" });
      }
      
      const validRewardActions: Record<string, number> = {
        'initial_free_gift': 200,
        'check_in': 5,
        'referral_success': 200,
        'subscription_bonus': 0,
      };
      
      if (!(actionType in validRewardActions)) {
        return res.status(400).json({ message: "Invalid action type" });
      }
      
      if (actionType === 'check_in') {
        const hasCheckedIn = await storage.hasCheckedInToday(userId);
        if (hasCheckedIn) {
          return res.status(400).json({ message: "Already checked in today" });
        }
      }
      
      const subscription = await storage.getSubscription(userId);
      const plan = await storage.getSubscriptionPlan(subscription?.tier || 'free');
      const multiplier = plan?.earningMultiplier || 1.0;
      
      const finalAmount = Math.floor(amount * multiplier);
      const multiplierDesc = multiplier > 1 ? ` (包含 ${multiplier}x 倍率加成)` : '';
      const finalDescription = description ? `${description}${multiplierDesc}` : multiplierDesc.trim();
      
      const account = await storage.earnStardust(userId, finalAmount, actionType, finalDescription || undefined, expiresInDays);
      
      res.json({ 
        success: true, 
        newBalance: account.balance,
        earned: finalAmount,
        baseAmount: amount,
        multiplier: multiplier,
        consecutiveCheckIns: account.consecutiveCheckIns,
      });
    } catch (error) {
      console.error("Error earning stardust:", error);
      res.status(500).json({ message: "Failed to earn stardust" });
    }
  });
  
  app.post("/api/stardust/check-in", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      
      const hasCheckedIn = await storage.hasCheckedInToday(userId);
      if (hasCheckedIn) {
        return res.status(400).json({ message: "Already checked in today" });
      }
      
      let account = await storage.getStardustAccount(userId);
      if (!account) {
        account = await storage.createStardustAccount(userId, 200);
      }
      
      let reward = 5;
      const currentConsecutive = account.consecutiveCheckIns || 0;
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const lastCheckIn = account.lastDailyCheckIn ? new Date(account.lastDailyCheckIn) : null;
      if (lastCheckIn) {
        lastCheckIn.setHours(0, 0, 0, 0);
      }
      
      const isConsecutive = lastCheckIn && lastCheckIn.getTime() === yesterday.getTime();
      const newConsecutive = isConsecutive ? currentConsecutive + 1 : 1;
      
      if (newConsecutive === 7) {
        reward += 50;
      }
      
      const updated = await storage.earnStardust(userId, reward, 'check_in', `每日签到 (连续${newConsecutive}天)`);
      
      res.json({ 
        ...updated,
        points: updated.balance,
        pointsEarned: reward, 
        consecutiveCheckIns: updated.consecutiveCheckIns,
      });
    } catch (error) {
      console.error("Error checking in:", error);
      res.status(500).json({ message: "Failed to check in" });
    }
  });
  
  app.get("/api/referrals", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const referrals = await storage.getReferrals(userId);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });
  
  app.get("/api/devices", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const devices = await storage.getDevices(userId);
      res.json(devices);
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });
  
  app.post("/api/devices", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { deviceType, deviceName } = req.body;
      
      if (!deviceType) {
        return res.status(400).json({ message: "Device type is required" });
      }
      
      const device = await storage.createDevice({
        userId,
        deviceType,
        deviceName: deviceName || `My ${deviceType}`,
        connectionStatus: "connected",
        lastSyncAt: new Date(),
        pushSettings: { dailyFortune: true, hourlyFortune: false, alerts: true },
      });
      
      res.json(device);
    } catch (error) {
      console.error("Error creating device:", error);
      res.status(500).json({ message: "Failed to create device" });
    }
  });
  
  app.delete("/api/devices/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const deviceId = parseInt(req.params.id);
      await storage.deleteDevice(deviceId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting device:", error);
      res.status(500).json({ message: "Failed to delete device" });
    }
  });
  
  app.get("/api/push-history", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getPushHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching push history:", error);
      res.status(500).json({ message: "Failed to fetch push history" });
    }
  });

  // Translation endpoints for language switching
  app.post("/api/translate/fortune", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { content, targetLanguage } = req.body;
      if (!content || !targetLanguage) {
        return res.status(400).json({ message: "Content and target language required" });
      }
      const translated = await translateContent(content, targetLanguage);
      res.json(translated);
    } catch (error) {
      console.error("Error translating fortune:", error);
      res.status(500).json({ message: "Failed to translate content" });
    }
  });

  app.post("/api/translate/divination", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { response, targetLanguage } = req.body;
      if (!response || !targetLanguage) {
        return res.status(400).json({ message: "Response and target language required" });
      }
      const translated = await translateDivinationResponse(response, targetLanguage);
      res.json({ response: translated });
    } catch (error) {
      console.error("Error translating divination:", error);
      res.status(500).json({ message: "Failed to translate divination" });
    }
  });

  app.post("/api/translate/bazi", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { interpretation, targetLanguage } = req.body;
      if (!interpretation || !targetLanguage) {
        return res.status(400).json({ message: "Interpretation and target language required" });
      }
      const translated = await translateBaziInterpretation(interpretation, targetLanguage);
      res.json(translated);
    } catch (error) {
      console.error("Error translating bazi:", error);
      res.status(500).json({ message: "Failed to translate bazi interpretation" });
    }
  });

  // Translate array of text labels (BaZi terms, elements, etc.)
  app.post("/api/translate/texts", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { texts, targetLanguage } = req.body;
      if (!texts || !Array.isArray(texts) || !targetLanguage) {
        return res.status(400).json({ message: "Texts array and target language required" });
      }
      const translations = await translateTexts(texts, targetLanguage);
      res.json({ translations });
    } catch (error) {
      console.error("Error translating texts:", error);
      res.status(500).json({ message: "Failed to translate texts" });
    }
  });

  // PayPal payment routes (blueprint:javascript_paypal)
  app.get("/api/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/api/paypal/order", async (req, res) => {
    await createPaypalOrder(req, res);
  });

  app.post("/api/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // Upgrade subscription after successful payment
  app.post("/api/subscription/upgrade", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { tier, paypalOrderId } = req.body;
      
      if (!tier || !["pro", "elite"].includes(tier)) {
        return res.status(400).json({ message: "Invalid tier" });
      }
      
      if (!paypalOrderId) {
        return res.status(400).json({ message: "PayPal order ID required" });
      }
      
      // Update subscription tier
      const subscription = await storage.getSubscription(userId);
      if (subscription) {
        await storage.updateSubscription(userId, {
          tier,
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
      } else {
        await storage.createSubscription({
          userId,
          tier,
          status: "active",
        });
      }
      
      // Add monthly stardust credits based on tier
      const credits = tier === "pro" ? 1200 : 4000;
      await storage.earnStardust(userId, credits, "subscription_monthly_credit");
      
      res.json({ success: true, tier });
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      res.status(500).json({ message: "Failed to upgrade subscription" });
    }
  });

  // Knowledge Base Management Routes
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [".pdf", ".md", ".txt"];
      const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));
      if (allowedTypes.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error("Only .pdf, .md, .txt files are allowed"));
      }
    }
  });

  app.get("/api/knowledge/status", isAuthenticated, async (req: any, res: Response) => {
    try {
      const status = await getKnowledgeStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting knowledge status:", error);
      res.status(500).json({ message: "Failed to get knowledge status" });
    }
  });

  app.post("/api/knowledge/upload", isAuthenticated, upload.single("file"), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const fileId = randomUUID();
      const filename = req.file.originalname;
      const fileType = filename.slice(filename.lastIndexOf(".") + 1);
      let content = req.file.buffer.toString("utf-8");

      if (fileType === "pdf") {
        content = req.file.buffer.toString("utf-8").replace(/[^\x20-\x7E\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\n\r\t]/g, " ");
      }

      const file = await storeKnowledgeFile(fileId, filename, fileType, content, req.user?.claims?.sub);
      res.json({ 
        success: true, 
        file,
        message: `Knowledge file processed: ${file.chunkCount} chunks created`
      });
    } catch (error) {
      console.error("Error uploading knowledge file:", error);
      res.status(500).json({ message: "Failed to upload knowledge file" });
    }
  });

  app.post("/api/knowledge/update", isAuthenticated, upload.single("file"), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      await clearAllKnowledge();

      const fileId = randomUUID();
      const filename = req.file.originalname;
      const fileType = filename.slice(filename.lastIndexOf(".") + 1);
      let content = req.file.buffer.toString("utf-8");

      if (fileType === "pdf") {
        content = req.file.buffer.toString("utf-8").replace(/[^\x20-\x7E\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\n\r\t]/g, " ");
      }

      const file = await storeKnowledgeFile(fileId, filename, fileType, content, req.user?.claims?.sub);
      res.json({ 
        success: true, 
        file,
        message: `Knowledge base updated: ${file.chunkCount} chunks created`
      });
    } catch (error) {
      console.error("Error updating knowledge file:", error);
      res.status(500).json({ message: "Failed to update knowledge file" });
    }
  });

  app.post("/api/knowledge/search", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { query, topK = 5 } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      const results = await searchKnowledge(query, topK);
      res.json({ results });
    } catch (error) {
      console.error("Error searching knowledge:", error);
      res.status(500).json({ message: "Failed to search knowledge" });
    }
  });

  app.delete("/api/knowledge", isAuthenticated, async (req: any, res: Response) => {
    try {
      await clearAllKnowledge();
      res.json({ success: true, message: "Knowledge base cleared" });
    } catch (error) {
      console.error("Error clearing knowledge:", error);
      res.status(500).json({ message: "Failed to clear knowledge" });
    }
  });

  app.post("/api/track", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const { event, event_id, properties } = req.body;
      
      if (!event) {
        return res.status(400).json({ message: "Event name required" });
      }
      
      const validEvents = ["ViewContent", "InitiateCheckout", "AddPaymentInfo", "PlaceAnOrder", "AddToCart", "CompletePayment", "CompleteRegistration", "Login"];
      if (!validEvents.includes(event)) {
        return res.status(400).json({ message: "Invalid event type" });
      }
      
      if (!req.body.ttclid || !req.body.ttp) {
        const profile = await storage.getUserProfile(userId);
        if (profile) {
          if (!req.body.ttclid && profile.ttclid) req.body.ttclid = profile.ttclid;
          if (!req.body.ttp && profile.ttp) req.body.ttp = profile.ttp;
        }
      }
      
      req.body.page_url = properties?.page_url || req.headers?.referer || "";
      
      if (event === "CompleteRegistration") {
        trackCompleteRegistration(req, userId, email);
      } else if (event === "Login") {
        trackLogin(req, userId, email);
      } else if (event === "InitiateCheckout" && properties) {
        trackInitiateCheckout(req, userId, email, properties.content_id || "", properties.content_name || "", properties.value || 0, properties.currency || "USD");
      } else if (event === "AddPaymentInfo" && properties) {
        trackAddPaymentInfo(req, userId, email, properties.content_id || "", properties.content_name || "", properties.value || 0, properties.currency || "USD");
      } else if (event === "PlaceAnOrder" && properties) {
        trackPlaceAnOrder(req, userId, email, properties.content_id || "", properties.content_name || "", properties.value || 0, properties.currency || "USD", properties.order_id);
      } else if (event === "CompletePayment" && properties) {
        trackPurchase(req, userId, email, properties.content_id || "", properties.content_name || "", properties.value || 0, properties.currency || "USD", properties.order_id);
      } else if (event === "ViewContent" && properties) {
        trackViewContent(req, userId, email, properties.content_id || "", properties.content_name || "", properties.content_category || "");
      } else {
        trackServerEvent(req, event, userId, email, properties);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking event:", error);
      res.status(500).json({ message: "Failed to track event" });
    }
  });

  // ==================== Admin Analytics Endpoints ====================
  const ADMIN_USER_IDS = ["53036667"];

  const isAdmin: any = (req: any, res: Response, next: any) => {
    const userId = req.user?.claims?.sub;
    if (!userId || !ADMIN_USER_IDS.includes(userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const { pool } = await import("./db");

      const q = async (query: string) => {
        const result = await pool.query(query);
        return Number(result.rows[0]?.count || 0);
      };

      const [totalUsers, totalRegistrations, paidUsers, proUsers, eliteUsers, todayRegistrations, totalDivinations, totalFortunes, totalMatchings, totalBazi] = await Promise.all([
        q("SELECT count(*) as count FROM user_profiles"),
        q("SELECT count(*) as count FROM users"),
        q("SELECT count(*) as count FROM subscriptions WHERE tier != 'free'"),
        q("SELECT count(*) as count FROM subscriptions WHERE tier = 'pro'"),
        q("SELECT count(*) as count FROM subscriptions WHERE tier = 'elite'"),
        q("SELECT count(*) as count FROM users WHERE created_at >= CURRENT_DATE"),
        q("SELECT count(*) as count FROM divinations"),
        q("SELECT count(*) as count FROM daily_fortunes"),
        q("SELECT count(*) as count FROM matchings"),
        q("SELECT count(*) as count FROM bazi_charts"),
      ]);

      res.json({
        totalUsers, totalRegistrations, paidUsers, proUsers, eliteUsers,
        todayRegistrations, totalDivinations, totalFortunes, totalMatchings, totalBazi,
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const { pool } = await import("./db");

      const result = await pool.query(`
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.profile_image_url,
          u.created_at,
          up.nickname,
          up.preferred_language,
          up.birth_date,
          COALESCE(s.tier, 'free') as tier,
          COALESCE(sa.balance, 0) as stardust_balance,
          COALESCE(sa.total_earned, 0) as total_earned,
          COALESCE(sa.total_spent, 0) as total_spent,
          (SELECT count(*) FROM divinations d WHERE d.user_id = u.id) as divination_count,
          (SELECT count(*) FROM daily_fortunes df WHERE df.user_id = u.id) as fortune_count
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN subscriptions s ON s.user_id = u.id
        LEFT JOIN stardust_accounts sa ON sa.user_id = u.id
        ORDER BY u.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/registrations-trend", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const { pool } = await import("./db");

      const result = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          count(*) as count
        FROM users
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Admin trend error:", error);
      res.status(500).json({ message: "Failed to fetch trend" });
    }
  });

  app.get("/api/admin/subscription-breakdown", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const { pool } = await import("./db");

      const breakdown = await pool.query(`
        SELECT 
          COALESCE(tier, 'free') as tier,
          count(*) as count
        FROM subscriptions
        GROUP BY tier
        ORDER BY count DESC
      `);

      const freeCount = await pool.query(`
        SELECT count(*) as count FROM users u 
        WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id)
      `);

      res.json({
        breakdown: breakdown.rows,
        freeWithoutSubscription: Number(freeCount.rows[0]?.count || 0),
      });
    } catch (error) {
      console.error("Admin breakdown error:", error);
      res.status(500).json({ message: "Failed to fetch breakdown" });
    }
  });

  app.get("/api/admin/pageviews-trend", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const { pool } = await import("./db");
      const days = parseInt(req.query.days as string) || 30;

      const pvTrend = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          count(*) as page_views,
          count(DISTINCT session_id) as unique_visitors
        FROM page_views
        WHERE created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [days]);

      const todayStats = await pool.query(`
        SELECT 
          count(*) as page_views,
          count(DISTINCT session_id) as unique_visitors
        FROM page_views
        WHERE created_at >= CURRENT_DATE
      `);

      res.json({
        trend: pvTrend.rows,
        today: {
          pageViews: Number(todayStats.rows[0]?.page_views || 0),
          uniqueVisitors: Number(todayStats.rows[0]?.unique_visitors || 0),
        },
      });
    } catch (error) {
      console.error("Admin pageviews error:", error);
      res.status(500).json({ message: "Failed to fetch pageviews" });
    }
  });

  app.get("/api/admin/check", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    res.json({ isAdmin: true });
  });

  return httpServer;
}
