import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Gift,
  Copy,
  Users,
  Star,
  Check,
  Clock,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Referral } from "@shared/schema";

type RewardTier = {
  count: number;
  rewardKey: "stardust200" | "extraStardust100" | "proTrial3" | "proTrial7" | "pro30";
  milestone: boolean;
};

const rewardTierData: RewardTier[] = [
  { count: 1, rewardKey: "stardust200", milestone: false },
  { count: 3, rewardKey: "extraStardust100", milestone: true },
  { count: 5, rewardKey: "proTrial3", milestone: true },
  { count: 10, rewardKey: "proTrial7", milestone: true },
  { count: 20, rewardKey: "pro30", milestone: true },
];

function useRewardTiers() {
  const { t } = useI18n();
  
  const getRewardText = (key: RewardTier["rewardKey"]) => {
    switch (key) {
      case "stardust200":
        return `200 ${t("stardust")}`;
      case "extraStardust100":
        return t("extraStardust").replace("{amount}", "100");
      case "proTrial3":
        return t("proTrialDays").replace("{days}", "3");
      case "proTrial7":
        return t("proTrialDays").replace("{days}", "7");
      case "pro30":
        return t("proDays").replace("{days}", "30");
    }
  };

  return rewardTierData.map(tier => ({
    count: tier.count,
    reward: getRewardText(tier.rewardKey),
    milestone: tier.milestone,
  }));
}

export default function ReferralPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const rewardTiers = useRewardTiers();

  const { data: referrals, isLoading } = useQuery<Referral[]>({
    queryKey: ["/api/referrals"],
  });

  const referralCode = user?.id?.slice(0, 8)?.toUpperCase() || "COSMIC123";
  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  const mockReferrals: Referral[] = [
    {
      id: 1,
      referrerId: "user1",
      referredId: "user2",
      referralCode,
      status: "completed",
      rewardType: "stardust",
      rewardAmount: 200,
      rewardedAt: new Date(),
      createdAt: new Date("2024-01-15"),
    },
    {
      id: 2,
      referrerId: "user1",
      referredId: "user3",
      referralCode,
      status: "completed",
      rewardType: "stardust",
      rewardAmount: 200,
      rewardedAt: new Date(),
      createdAt: new Date("2024-01-20"),
    },
    {
      id: 3,
      referrerId: "user1",
      referredId: null,
      referralCode,
      status: "pending",
      rewardType: null,
      rewardAmount: null,
      rewardedAt: null,
      createdAt: new Date("2024-01-25"),
    },
  ];

  const displayReferrals = referrals || mockReferrals;
  const completedCount = displayReferrals.filter((r) => r.status === "completed").length;
  const totalReward = displayReferrals
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + (r.rewardAmount || 0), 0);

  const handleCopy = async (text: string, type: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: t("success"),
        description: type === "code" ? t("inviteCodeCopied") : t("inviteLinkCopied"),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t("error"), description: t("copyFailed"), variant: "destructive" });
    }
  };

  const nextMilestone = rewardTiers.find((tier) => tier.count > completedCount);
  const progressToNext = nextMilestone
    ? (completedCount / nextMilestone.count) * 100
    : 100;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">{t("referral")}</h1>
        <p className="text-muted-foreground">{t("referralDesc")}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-hidden border-purple-500/20 bg-gradient-to-r from-purple-900/30 to-pink-900/20">
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
              <div className="text-center md:text-left">
                <p className="mb-2 text-sm text-muted-foreground">{t("inviteCode")}</p>
                <p className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-4xl font-bold tracking-wider text-transparent">
                  {referralCode}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleCopy(referralCode, "code")}
                  data-testid="button-copy-code"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {t("copyInviteCode")}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleCopy(referralLink, "link")}
                  data-testid="button-copy-link"
                >
                  <Copy className="h-4 w-4" />
                  {t("copyLink")}
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-background/50 p-4">
              <p className="mb-2 text-sm text-muted-foreground">{t("inviteLink")}</p>
              <Input
                value={referralLink}
                readOnly
                className="bg-background"
                data-testid="input-referral-link"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/20">
                <Users className="h-7 w-7 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("successfulInvites")}</p>
                <p className="text-3xl font-bold">{completedCount}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
                <Star className="h-7 w-7 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("totalEarned")}</p>
                <p className="text-3xl font-bold">{totalReward} {t("stardust")}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
                <Gift className="h-7 w-7 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("pendingRewards")}</p>
                <p className="text-3xl font-bold">
                  {displayReferrals.filter((r) => r.status === "pending").length}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {t("inviteReward")}
            </CardTitle>
            <CardDescription>{t("moreInvitesMoreRewards")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {nextMilestone && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{t("toNextMilestone")}</span>
                  <span className="font-medium">
                    {completedCount}/{nextMilestone.count} {t("people")}
                  </span>
                </div>
                <Progress value={progressToNext} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {t("inviteMoreToGet").replace("{count}", String(nextMilestone.count - completedCount))}: {nextMilestone.reward}
                </p>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-5">
              {rewardTiers.map((tier) => {
                const achieved = completedCount >= tier.count;
                return (
                  <div
                    key={tier.count}
                    className={`relative rounded-lg border p-4 text-center ${
                      achieved
                        ? "border-green-500 bg-green-500/10"
                        : "border-muted bg-muted/30"
                    }`}
                  >
                    {tier.milestone && (
                      <Badge
                        variant="secondary"
                        className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs"
                      >
                        {t("milestone")}
                      </Badge>
                    )}
                    <p className="mt-2 text-2xl font-bold">{tier.count}</p>
                    <p className="text-xs text-muted-foreground">{t("people")}</p>
                    <p className="mt-2 text-sm font-medium">{tier.reward}</p>
                    {achieved && <Check className="mx-auto mt-2 h-5 w-5 text-green-400" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("inviteHistory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("invitee")}</TableHead>
                    <TableHead>{t("registrationTime")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">{t("reward")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell className="font-medium">
                        {referral.referredId ? `${t("user")}${referral.referredId.slice(-4)}` : "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={referral.status === "completed" ? "default" : "secondary"}
                        >
                          {referral.status === "completed" ? t("completed") : t("pendingActivation")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {referral.rewardAmount ? `+${referral.rewardAmount} ${t("stardust")}` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
