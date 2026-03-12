import { useState, useEffect, useRef } from "react";
import { ttqTrackViewContent } from "@/lib/tiktok-pixel";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { zhCN, enUS, ja, ko } from "date-fns/locale";
import {
  TrendingUp,
  Heart,
  DollarSign,
  Activity,
  BookOpen,
  Clock,
  Sparkles,
  ChevronRight,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Check,
  X,
  Calendar,
  Star,
  Zap,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useStardust } from "@/hooks/use-stardust";
import { useToast } from "@/hooks/use-toast";
import { useGlobalTranslation, setOriginalFortune } from "@/hooks/use-global-translation";
import { TranslationOverlay } from "@/components/translation-skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { DailyFortune } from "@shared/schema";

interface HourlyFortuneData {
  hour: string;
  score: number;
  favorable: string;
  unfavorable: string;
}

interface FortuneInsight {
  text: string;
  type: "favorable" | "caution" | "advice";
}

interface ExtendedFortune {
  id: number;
  userId: string;
  date: Date;
  overallScore: number;
  careerScore: number;
  careerDesc: string | null;
  loveScore: number;
  loveDesc: string | null;
  wealthScore: number;
  wealthDesc: string | null;
  healthScore: number;
  healthDesc: string | null;
  studyScore: number;
  studyDesc: string | null;
  hourlyFortunes?: HourlyFortuneData[] | unknown;
  recommendations?: unknown;
  aiInterpretation: string | null;
  insights?: FortuneInsight[];
  createdAt: Date;
}

// Daily fortune now includes hourly fortunes - combined generation

const dimensionConfigBase = [
  { key: "career", labelKey: "careerFortune", icon: TrendingUp, color: "from-purple-500 to-purple-600", bgColor: "bg-purple-500/20" },
  { key: "love", labelKey: "loveFortune", icon: Heart, color: "from-pink-500 to-pink-600", bgColor: "bg-pink-500/20" },
  { key: "wealth", labelKey: "wealthFortune", icon: DollarSign, color: "from-orange-500 to-orange-600", bgColor: "bg-orange-500/20" },
  { key: "health", labelKey: "healthFortune", icon: Activity, color: "from-emerald-500 to-emerald-600", bgColor: "bg-emerald-500/20" },
  { key: "study", labelKey: "studyFortune", icon: BookOpen, color: "from-blue-500 to-blue-600", bgColor: "bg-blue-500/20" },
] as const;

const hourlyBranchesBase = [
  { branchKey: "hourZi", time: "23:00-01:00", icon: Moon },
  { branchKey: "hourChou", time: "01:00-03:00", icon: Moon },
  { branchKey: "hourYin", time: "03:00-05:00", icon: Sunrise },
  { branchKey: "hourMao", time: "05:00-07:00", icon: Sunrise },
  { branchKey: "hourChen", time: "07:00-09:00", icon: Sun },
  { branchKey: "hourSi", time: "09:00-11:00", icon: Sun },
  { branchKey: "hourWu", time: "11:00-13:00", icon: Sun },
  { branchKey: "hourWei", time: "13:00-15:00", icon: Sun },
  { branchKey: "hourShen", time: "15:00-17:00", icon: Sunset },
  { branchKey: "hourYou", time: "17:00-19:00", icon: Sunset },
  { branchKey: "hourXu", time: "19:00-21:00", icon: Moon },
  { branchKey: "hourHai", time: "21:00-23:00", icon: Moon },
] as const;

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-cyan-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function getScoreLabelKey(score: number): "veryLucky" | "lucky" | "neutral" | "unlucky" | "veryUnlucky" {
  if (score >= 90) return "veryLucky";
  if (score >= 70) return "lucky";
  if (score >= 50) return "neutral";
  if (score >= 30) return "unlucky";
  return "veryUnlucky";
}

function getScoreBadgeClass(score: number) {
  if (score >= 90) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (score >= 70) return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
  if (score >= 50) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

function getCurrentHourIndex() {
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 1) return 0;
  if (hour >= 1 && hour < 3) return 1;
  if (hour >= 3 && hour < 5) return 2;
  if (hour >= 5 && hour < 7) return 3;
  if (hour >= 7 && hour < 9) return 4;
  if (hour >= 9 && hour < 11) return 5;
  if (hour >= 11 && hour < 13) return 6;
  if (hour >= 13 && hour < 15) return 7;
  if (hour >= 15 && hour < 17) return 8;
  if (hour >= 17 && hour < 19) return 9;
  if (hour >= 19 && hour < 21) return 10;
  return 11;
}

function isToday(date: Date | string | undefined): boolean {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && 
         d.getMonth() === now.getMonth() && 
         d.getDate() === now.getDate();
}

const dateLocales = { zh: zhCN, en: enUS, ja, ko };
const dateFormats = {
  zh: "yyyy年M月d日EEEE",
  en: "EEEE, MMMM d, yyyy",
  ja: "yyyy年M月d日EEEE",
  ko: "yyyy년 M월 d일 EEEE",
};

export default function DashboardPage() {
  const { t, language } = useI18n();
  const { toast } = useToast();
  const { translatedFortune, isTranslating } = useGlobalTranslation();
  const today = format(new Date(), dateFormats[language] || dateFormats.zh, { locale: dateLocales[language] || zhCN });
  const { checkInMutation, hasCheckedInToday, balance } = useStardust();
  const lastFortuneIdRef = useRef<number | null>(null);

  useEffect(() => {
    ttqTrackViewContent({ contentId: "dashboard", contentName: "Daily Fortune", contentCategory: "fortune" });
  }, []);

  const { data: fortune, isLoading } = useQuery<ExtendedFortune>({
    queryKey: ["/api/daily-fortune"],
  });

  const generatedLangRef = useRef<string>("zh");
  
  useEffect(() => {
    if (fortune && fortune.id !== lastFortuneIdRef.current) {
      lastFortuneIdRef.current = fortune.id;
      setOriginalFortune(fortune, "zh");
    }
  }, [fortune]);
  
  const displayFortune = translatedFortune || fortune;
  
  const dailyGeneratedToday = fortune && isToday(fortune.date);
  // Hourly fortunes are now included in daily fortune generation
  const hourlyGeneratedToday = fortune && Array.isArray(fortune.hourlyFortunes) && fortune.hourlyFortunes.length > 0 && isToday(fortune.date);
  
  const generateDailyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/daily-fortune/generate", { language });
      if (!res.ok) {
        const error = await res.json();
        if (res.status === 402) {
          throw new Error(`${t("stardustInsufficient")}: ${t("stardustRequired")} 5 ${t("stardust")}, ${t("stardustCurrent")} ${error.currentBalance || 0}`);
        }
        throw new Error(error.message || t("error"));
      }
      return res.json();
    },
    onSuccess: (data) => {
      generatedLangRef.current = language;
      if (data && data.id) {
        lastFortuneIdRef.current = data.id;
        setOriginalFortune(data, language);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/daily-fortune"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stardust"] });
      toast({ title: t("fortuneGenerated"), description: `${t("stardust")} -5` });
    },
    onError: (error: Error) => {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    },
  });
  
  
  const hasFortune = !!fortune;
  const finalDisplayFortune = displayFortune || fortune;
  const currentHourIndex = getCurrentHourIndex();

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const dimensions = [
    { key: "career", score: finalDisplayFortune?.careerScore ?? 0 },
    { key: "love", score: finalDisplayFortune?.loveScore ?? 0 },
    { key: "wealth", score: finalDisplayFortune?.wealthScore ?? 0 },
    { key: "health", score: finalDisplayFortune?.healthScore ?? 0 },
    { key: "study", score: finalDisplayFortune?.studyScore ?? 0 },
  ];

  const insights = finalDisplayFortune?.insights || [];
  const hourlyFortunes = (Array.isArray(finalDisplayFortune?.hourlyFortunes) && hourlyGeneratedToday
    ? finalDisplayFortune.hourlyFortunes 
    : null) as HourlyFortuneData[] | null;

  return (
    <div className="relative space-y-6 p-6">
      {isTranslating && <TranslationOverlay />}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("dailyFortune")}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span data-testid="text-current-date">{today}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => generateDailyMutation.mutate()}
            disabled={generateDailyMutation.isPending || !!dailyGeneratedToday}
            variant="outline"
            className="gap-2"
            data-testid="button-generate-daily"
          >
            {generateDailyMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {dailyGeneratedToday ? t("fortuneGenerated") : `${t("generateDailyFortune")} (5${t("stardust")})`}
          </Button>
          <Button
            onClick={() => checkInMutation.mutate()}
            disabled={checkInMutation.isPending || hasCheckedInToday}
            className="gap-2"
            data-testid="button-check-in"
          >
            <Star className="h-4 w-4" />
            {hasCheckedInToday ? t("alreadyCheckedIn") : checkInMutation.isPending ? t("loading") : t("checkIn")}
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-900/40 via-purple-800/30 to-indigo-900/20">
          <CardContent className="p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-purple-300">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("todayFortune")}</span>
                </div>
                
                <div className="flex items-baseline gap-2">
                  <span className={`text-6xl font-bold ${dailyGeneratedToday && finalDisplayFortune ? getScoreColor(finalDisplayFortune.overallScore) : "text-muted-foreground"}`} data-testid="text-overall-score">
                    {dailyGeneratedToday && finalDisplayFortune ? finalDisplayFortune.overallScore : "??"}
                  </span>
                  <span className="text-xl text-muted-foreground">/ 100</span>
                  {dailyGeneratedToday && finalDisplayFortune && (
                    <Badge variant="outline" className={`ml-2 ${getScoreBadgeClass(finalDisplayFortune.overallScore)}`}>
                      {t(getScoreLabelKey(finalDisplayFortune.overallScore))}
                    </Badge>
                  )}
                </div>
                
                <p className="text-muted-foreground" data-testid="text-fortune-summary">
                  {dailyGeneratedToday && finalDisplayFortune ? finalDisplayFortune.aiInterpretation : t("fortuneNotGenerated")}
                </p>
              </div>
              
              <div className="space-y-3">
                {dailyGeneratedToday && insights.length > 0 ? insights.map((insight: FortuneInsight, index: number) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-lg bg-white/5 p-3"
                    data-testid={`card-insight-${index}`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      insight.type === "favorable" ? "bg-green-500/20 text-green-400" :
                      insight.type === "caution" ? "bg-amber-500/20 text-amber-400" :
                      "bg-purple-500/20 text-purple-400"
                    }`}>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                    <span className="text-sm text-foreground/80">{insight.text}</span>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20">
                      <Sparkles className="h-6 w-6 text-purple-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">{t("fortuneNotGenerated")}</p>
                    <p className="text-xs text-muted-foreground/60">5 {t("stardust")}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          {!dailyGeneratedToday && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/80 via-background/40 to-transparent pointer-events-none" />
          )}
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold">{t("overall")}</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {dimensions.map((dim, index) => {
            const config = dimensionConfigBase.find(c => c.key === dim.key)!;
            const Icon = config.icon;
            
            return (
              <motion.div
                key={dim.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + index * 0.05 }}
              >
                <Card className="relative hover-elevate overflow-hidden" data-testid={`card-dimension-${dim.key}`}>
                  <CardContent className="p-4">
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${config.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-sm text-muted-foreground">{t(config.labelKey)}</div>
                    <div className={`text-2xl font-bold ${dailyGeneratedToday ? getScoreColor(dim.score) : "text-muted-foreground"}`} data-testid={`text-score-${dim.key}`}>
                      {dailyGeneratedToday ? dim.score : "??"}
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div 
                        className={`h-full bg-gradient-to-r ${config.color}`}
                        style={{ width: dailyGeneratedToday ? `${dim.score}%` : "0%" }}
                      />
                    </div>
                  </CardContent>
                  {!dailyGeneratedToday && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none" />
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-400" />
              {t("hourlyFortune")}
            </CardTitle>
            {!dailyGeneratedToday && (
              <Badge variant="outline" className="text-muted-foreground">
                {t("fortuneNotGenerated")}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {hourlyBranchesBase.map((hour, index) => {
                const isCurrent = index === currentHourIndex;
                const hourData = hourlyFortunes?.[index];
                const HourIcon = hour.icon;
                
                return (
                  <div
                    key={hour.branchKey}
                    className={`relative rounded-lg border p-3 ${
                      isCurrent
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/10 bg-white/5 hover-elevate"
                    }`}
                    data-testid={`card-hourly-${index}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HourIcon className="h-4 w-4 text-purple-400" />
                        <span className="font-medium">{t(hour.branchKey)}</span>
                        {isCurrent && (
                          <Badge variant="outline" className="border-green-500/30 bg-green-500/20 text-green-400 text-[10px]">
                            {t("current")}
                          </Badge>
                        )}
                      </div>
                      <span className={`text-xl font-bold ${hourlyGeneratedToday ? getScoreColor(hourData?.score || 50) : "text-muted-foreground"}`}>
                        {hourlyGeneratedToday ? (hourData?.score || 50) : "??"}
                      </span>
                    </div>
                    
                    <div className="mb-2 text-xs text-muted-foreground">{hour.time}</div>
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-green-400" />
                        <span className="text-muted-foreground">{t("favorableFor")}</span>
                        <span className="text-foreground">{hourlyGeneratedToday ? (hourData?.favorable || "—") : "???"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <X className="h-3 w-3 text-red-400" />
                        <span className="text-muted-foreground">{t("unfavorableFor")}</span>
                        <span className="text-foreground">{hourlyGeneratedToday ? (hourData?.unfavorable || "—") : "???"}</span>
                      </div>
                    </div>
                    {!hourlyGeneratedToday && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
