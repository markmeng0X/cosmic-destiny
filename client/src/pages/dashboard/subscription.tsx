import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Star,
  Check,
  Crown,
  Sparkles,
  Zap,
  Shield,
  Watch,
  Palette,
  Sun,
  Clock,
  Compass,
  Globe,
  Users,
  History,
  CreditCard,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useStardust } from "@/hooks/use-stardust";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import PayPalAdvancedCheckout from "@/components/PayPalAdvancedCheckout";
import { ttqTrackInitiateCheckout, ttqTrackPurchase, ttqTrackPlaceAnOrder, ttqTrackViewContent } from "@/lib/tiktok-pixel";
import type { Subscription, StardustAccount, StardustLog } from "@shared/schema";

export default function SubscriptionPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { account, balance, isLoading: stardustLoading } = useStardust();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<{ id: string; price: number; displayName: string } | null>(null);

  const upgradeMutation = useMutation({
    mutationFn: async ({ tier, paypalOrderId }: { tier: string; paypalOrderId: string }) => {
      const res = await apiRequest("POST", "/api/subscription/upgrade", { tier, paypalOrderId });
      if (!res.ok) throw new Error("Failed to upgrade");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stardust"] });
      setShowPaymentModal(false);
      setSelectedTier(null);
      toast({
        title: t("upgradeSuccess"),
        description: t("upgradeSuccessDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("upgradeFailed"),
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    ttqTrackViewContent({
      contentId: "subscription",
      contentName: "Subscription Plans",
      contentCategory: "subscription",
    });
  }, []);

  const handleUpgradeClick = (tier: { id: string; price: number; displayName: string }) => {
    setSelectedTier(tier);
    setShowPaymentModal(true);
    ttqTrackInitiateCheckout({
      planId: tier.id,
      planName: tier.displayName,
      price: tier.price,
    });
  };

  const handlePaymentSuccess = (orderId: string) => {
    if (selectedTier) {
      ttqTrackPlaceAnOrder({
        planId: selectedTier.id,
        planName: selectedTier.displayName,
        price: selectedTier.price,
        orderId,
      });
      ttqTrackPurchase({
        planId: selectedTier.id,
        planName: selectedTier.displayName,
        price: selectedTier.price,
        orderId,
      });
      upgradeMutation.mutate({ tier: selectedTier.id, paypalOrderId: orderId });
    }
  };

  const tiers = [
    {
      id: "free",
      nameKey: "free" as const,
      displayName: t("stardustVisitor"),
      price: 0,
      period: "",
      icon: Star,
      color: "from-slate-500 to-slate-600",
      aiModel: `GPT-4o-mini (${t("fastMode")})`,
      monthlyCredits: 0,
      earningMultiplier: "1.0x",
      shopDiscount: null,
      badge: null,
      features: [
        { text: t("basicAiModel"), included: true },
        { text: t("zeroMonthlyCredits"), included: true },
        { text: t("basicCreditRate"), included: true },
        { text: t("basicBaziOverview"), included: true },
        { text: t("cannotSwitchCulture"), included: false },
        { text: t("cannotUseBaziDeep"), included: false },
      ],
    },
    {
      id: "pro",
      nameKey: "pro" as const,
      displayName: t("galaxyExplorer"),
      price: 9.9,
      period: t("perMonth"),
      icon: Crown,
      color: "from-purple-500 to-cyan-500",
      popular: true,
      aiModel: `GPT-4o (${t("professionalMode")})`,
      monthlyCredits: 1200,
      earningMultiplier: "1.5x",
      shopDiscount: "10%",
      badge: t("exclusiveSilverBadge"),
      features: [
        { text: t("gpt4oProModel"), included: true },
        { text: t("monthlyAutoRecharge").replace("{amount}", "1,200"), included: true },
        { text: t("creditsEfficiencyBonus").replace("{rate}", "1.5x"), included: true },
        { text: t("all8CultureSystems"), included: true },
        { text: t("canUseAllFeatures"), included: true },
        { text: t("starMarket9Off"), included: true },
        { text: t("exclusiveSilverBadge"), included: true },
      ],
    },
    {
      id: "elite",
      nameKey: "elite" as const,
      displayName: t("cosmicMaster"),
      price: 29.9,
      period: t("perMonth"),
      icon: Sparkles,
      color: "from-amber-500 to-orange-500",
      aiModel: `GPT-4o (${t("priorityMode")})`,
      monthlyCredits: 4000,
      earningMultiplier: "2.0x",
      shopDiscount: "20%",
      badge: t("exclusiveGoldFrame"),
      features: [
        { text: t("gpt4oProPriority"), included: true },
        { text: t("monthlyAutoRecharge").replace("{amount}", "4,000"), included: true },
        { text: t("creditsEfficiencyBonus").replace("{rate}", "2.0x"), included: true },
        { text: t("canUseAllFeatures"), included: true },
        { text: t("priorityNewFeatures"), included: true },
        { text: t("starMarket8Off"), included: true },
        { text: t("exclusiveGoldFrame"), included: true },
      ],
    },
  ];

  function formatActionType(actionType: string): string {
    const actionMap: Record<string, string> = {
      'api_call_daily_fortune': t("actionDailyFortune"),
      'api_call_hourly_fortune': t("actionHourlyFortune"),
      'api_call_ai_deep_query': t("actionAiDeepQuery"),
      'api_call_bazi_deep_read': t("actionBaziDeepRead"),
      'api_call_culture_switch': t("actionCultureSwitch"),
      'api_call_compatibility_reading': t("actionCompatibilityReading"),
      'check_in': t("actionCheckIn"),
      'check_in_weekly_bonus': t("actionWeeklyBonus"),
      'referral_success': t("actionReferralSuccess"),
      'initial_free_gift': t("actionInitialGift"),
    };
    return actionMap[actionType] || actionType;
  }

  const { data: subscription, isLoading: subLoading } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
  });

  const { data: stardustLogs, isLoading: logsLoading } = useQuery<StardustLog[]>({
    queryKey: ["/api/stardust/logs"],
    enabled: showHistoryModal,
  });

  const displayStardust = {
    balance: balance,
    points: balance,
    totalEarned: account?.totalEarned || 0,
    totalSpent: account?.totalSpent || 0,
    consecutiveCheckIns: account?.consecutiveCheckIns || 0,
  };
  const currentTier = subscription?.tier || "free";

  if (subLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">{t("subscription")}</h1>
        <p className="text-muted-foreground">{t("manageSubscription")}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-hidden border-amber-500/20 bg-gradient-to-r from-amber-900/20 to-purple-900/20">
          <CardContent className="flex flex-col items-center justify-between gap-6 p-6 md:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-purple-500">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("stardustBalance")}</p>
                <p className="text-3xl font-bold text-amber-400">{displayStardust.points}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">+{displayStardust.totalEarned}</p>
                <p className="text-xs text-muted-foreground">{t("totalEarnedLabel")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">-{displayStardust.totalSpent}</p>
                <p className="text-xs text-muted-foreground">{t("totalSpentLabel")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">{displayStardust.consecutiveCheckIns}</p>
                <p className="text-xs text-muted-foreground">{t("consecutiveCheckIn")}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowHistoryModal(true)}
                className="gap-2"
                data-testid="button-stardust-history"
              >
                <History className="h-4 w-4" />
                {t("usageHistory")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t("stardustUsageHistory")}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {logsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : stardustLogs && stardustLogs.length > 0 ? (
              <div className="space-y-2">
                {stardustLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{formatActionType(log.actionType)}</p>
                      {log.description && (
                        <p className="text-sm text-muted-foreground">{log.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : t("unknownTime")}
                      </p>
                    </div>
                    <div className={`text-lg font-bold ${log.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {log.amount > 0 ? '+' : ''}{log.amount}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                {t("noUsageHistory")}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("stardustEarningMethods")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { icon: Star, action: t("dailyCheckInReward"), reward: `5 (${t("weeklyBonusReward")})`, color: "text-amber-400" },
                { icon: Crown, action: t("inviteFriendReward"), reward: "200", color: "text-green-400" },
              ].map((item) => (
                <div
                  key={item.action}
                  className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4"
                >
                  <item.icon className={`h-8 w-8 ${item.color}`} />
                  <div>
                    <p className="font-medium">{item.action}</p>
                    <p className="text-sm text-muted-foreground">+{item.reward} {t("stardust")}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="mb-4 text-xl font-bold">{t("subscriptionPlans")}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier, index) => {
            const isCurrent = currentTier === tier.id;
            const Icon = tier.icon;
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <Card
                  className={`relative h-full ${
                    tier.popular ? "ring-2 ring-purple-500" : ""
                  } ${isCurrent ? "border-green-500" : ""}`}
                >
                  {tier.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500">
                      {t("mostPopular")}
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge className="absolute -top-3 right-4 bg-green-500">{t("currentPlan")}</Badge>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r ${tier.color}`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle>{tier.displayName}</CardTitle>
                        <div>
                          <span className="text-2xl font-bold">${tier.price}</span>
                          {tier.period && (
                            <span className="text-muted-foreground">{tier.period}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 rounded-lg bg-muted/30 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("aiModel")}</span>
                        <span className="font-medium">{tier.aiModel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("monthlyCredits")}</span>
                        <span className="font-medium">{tier.monthlyCredits.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("creditsMultiplier")}</span>
                        <span className="font-medium">{tier.earningMultiplier}</span>
                      </div>
                      {tier.shopDiscount && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t("starMarketDiscount")}</span>
                          <span className="font-medium text-green-400">{tier.shopDiscount}</span>
                        </div>
                      )}
                    </div>
                    <ul className="space-y-3">
                      {tier.features.map((feature) => (
                        <li key={feature.text} className="flex items-center gap-2 text-sm">
                          {feature.included ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                          )}
                          <span
                            className={
                              feature.included ? "text-foreground" : "text-muted-foreground"
                            }
                          >
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={isCurrent ? "secondary" : tier.popular ? "default" : "outline"}
                      disabled={isCurrent || tier.price === 0}
                      onClick={() => tier.price > 0 && handleUpgradeClick({ id: tier.id, price: tier.price, displayName: tier.displayName })}
                      data-testid={`button-subscribe-${tier.id}`}
                    >
                      {isCurrent ? t("currentPlan") : tier.price === 0 ? t("currentFree") : t("upgrade")}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("stardustExchange")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Sun className="h-8 w-8 text-amber-400" />
                  <div>
                    <p className="font-medium">{t("dailyFortuneGeneration")}</p>
                    <p className="text-sm text-muted-foreground">{t("getDailyFortune")}</p>
                  </div>
                </div>
                <Button variant="outline" data-testid="button-redeem-daily-fortune">
                  5 {t("stardust")}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="font-medium">{t("hourlyFortuneView")}</p>
                    <p className="text-sm text-muted-foreground">{t("viewHourlyFortune")}</p>
                  </div>
                </div>
                <Button variant="outline" data-testid="button-redeem-hourly-fortune">
                  10 {t("stardust")}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Zap className="h-8 w-8 text-purple-400" />
                  <div>
                    <p className="font-medium">{t("aiDeepDivination")}</p>
                    <p className="text-sm text-muted-foreground">{t("unlockDeepDivination")}</p>
                  </div>
                </div>
                <Button variant="outline" data-testid="button-redeem-divination">
                  20 {t("stardust")}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Compass className="h-8 w-8 text-rose-400" />
                  <div>
                    <p className="font-medium">{t("baziDeepReading")}</p>
                    <p className="text-sm text-muted-foreground">{t("getBaziDeepAnalysis")}</p>
                  </div>
                </div>
                <Button variant="outline" data-testid="button-redeem-bazi-deep">
                  20 {t("stardust")}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Globe className="h-8 w-8 text-emerald-400" />
                  <div>
                    <p className="font-medium">{t("switchCultureReading")}</p>
                    <p className="text-sm text-muted-foreground">{t("experienceDifferentCulture")}</p>
                  </div>
                </div>
                <Button variant="outline" data-testid="button-redeem-culture-switch">
                  15 {t("stardust")}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-pink-400" />
                  <div>
                    <p className="font-medium">{t("compatibilityAnalysis")}</p>
                    <p className="text-sm text-muted-foreground">{t("baziCompatibility")}</p>
                  </div>
                </div>
                <Button variant="outline" data-testid="button-redeem-compatibility">
                  20 {t("stardust")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("upgradeSubscription")}
            </DialogTitle>
            <DialogDescription>
              {selectedTier && t("upgradeTo").replace("{plan}", selectedTier.displayName)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTier && (
              <>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{selectedTier.displayName}</span>
                    <span className="text-xl font-bold">${selectedTier.price}/{t("month")}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedTier.id === "pro" ? t("proDescription") : t("eliteDescription")}
                  </p>
                </div>
                
                <div className="space-y-2">
                  {upgradeMutation.isPending ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                      <span className="ml-2">{t("processing")}</span>
                    </div>
                  ) : (
                    <PayPalAdvancedCheckout
                      amount={selectedTier.price.toString()}
                      currency="USD"
                      intent="CAPTURE"
                      onSuccess={handlePaymentSuccess}
                      onError={(err) => {
                        console.error("PayPal error:", err);
                        toast({
                          title: t("error"),
                          description: t("paymentFailed"),
                          variant: "destructive",
                        });
                      }}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
