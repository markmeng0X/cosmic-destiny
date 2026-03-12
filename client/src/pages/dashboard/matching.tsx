import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ttqTrackViewContent } from "@/lib/tiktok-pixel";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users,
  Heart,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  Globe,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useGlobalTranslation, setOriginalMatching } from "@/hooks/use-global-translation";
import { TranslationOverlay } from "@/components/translation-skeleton";
import { MaskedContent } from "@/components/masked-content";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { timezoneOptions } from "@/components/timezone-provider";
import type { Matching } from "@shared/schema";

const matchingSchemaBase = z.object({
  partnerNickname: z.string().min(1),
  partnerGender: z.string().min(1),
  partnerTimezone: z.string().min(1),
  partnerBirthDate: z.string().min(1),
  partnerBirthTime: z.string().min(1),
  partnerBirthPlace: z.string().min(1),
  relationshipType: z.string().min(1),
  selectedCulture: z.string().min(1),
});

type MatchingForm = z.infer<typeof matchingSchemaBase>;

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-cyan-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

export default function MatchingPage() {
  const { t, language } = useI18n();
  const { toast } = useToast();
  const { translatedMatching, isTranslating } = useGlobalTranslation();
  const [currentResult, setCurrentResult] = useState<Matching | null>(null);
  const [unlockedMatchingIds, setUnlockedMatchingIds] = useState<Set<number>>(new Set());
  const [isUnlocking, setIsUnlocking] = useState(false);
  const lastMatchingIdRef = useRef<number | null>(null);

  useEffect(() => {
    ttqTrackViewContent({ contentId: "matching", contentName: "Compatibility Matching", contentCategory: "matching" });
  }, []);

  const { data: history, isLoading: historyLoading } = useQuery<Matching[]>({
    queryKey: ["/api/matchings"],
  });

  const matchingGeneratedLangRef = useRef<string>("zh");
  
  const isContentLocked = useCallback((matchingId: number) => {
    if (currentResult?.id === matchingId) return false;
    return !unlockedMatchingIds.has(matchingId);
  }, [currentResult, unlockedMatchingIds]);

  const handleUnlock = useCallback(async (matchingId: number) => {
    setIsUnlocking(true);
    try {
      const res = await apiRequest("POST", "/api/stardust/consume", {
        action: "compatibility_reading",
        amount: 20,
      });
      if (res.ok) {
        setUnlockedMatchingIds(prev => new Set(Array.from(prev).concat([matchingId])));
        queryClient.invalidateQueries({ queryKey: ["/api/stardust"] });
        toast({ title: t("success"), description: t("contentUnlocked") });
      } else {
        const error = await res.json();
        toast({ 
          title: t("stardustInsufficient"),
          description: `${t("stardustRequired")} 20 ${t("stardust")}，${t("stardustCurrent")} ${error.currentBalance || 0}`,
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ title: t("error"), variant: "destructive" });
    } finally {
      setIsUnlocking(false);
    }
  }, [t, toast]);

  useEffect(() => {
    const resultToRegister = currentResult || (history?.length ? history[0] : null);
    if (resultToRegister && resultToRegister.id !== lastMatchingIdRef.current) {
      lastMatchingIdRef.current = resultToRegister.id;
      matchingGeneratedLangRef.current = "zh";
      setOriginalMatching(resultToRegister, "zh");
    }
  }, [currentResult, history]);

  const hourOptions = [
    { value: "zi", label: t("hourZi") },
    { value: "chou", label: t("hourChou") },
    { value: "yin", label: t("hourYin") },
    { value: "mao", label: t("hourMao") },
    { value: "chen", label: t("hourChen") },
    { value: "si", label: t("hourSi") },
    { value: "wu", label: t("hourWu") },
    { value: "wei", label: t("hourWei") },
    { value: "shen", label: t("hourShen") },
    { value: "you", label: t("hourYou") },
    { value: "xu", label: t("hourXu") },
    { value: "hai", label: t("hourHai") },
  ];

  const relationshipTypes = [
    { value: "romantic", label: t("romantic") },
    { value: "friendship", label: t("friendship") },
    { value: "business", label: t("business") },
    { value: "family", label: t("family") },
    { value: "pet", label: t("pet") },
  ];

  const cultures = [
    { value: "none", label: t("noCulture") },
    { value: "china", label: t("chinaMyth") },
    { value: "japan", label: t("japanRpg") },
    { value: "western", label: t("westernFantasy") },
    { value: "buddhist", label: t("buddhist") },
    { value: "arabic", label: t("arabic") },
    { value: "pokemon", label: t("pokemon") },
    { value: "marvel", label: t("marvel") },
    { value: "genshin", label: t("genshin") },
  ];

  function getScoreLabel(score: number) {
    if (score >= 90) return t("perfectMatch");
    if (score >= 75) return t("goodMatch");
    if (score >= 60) return t("averageMatch");
    if (score >= 40) return t("needsWork");
    return t("beCareful");
  }

  const dimensionLabels: Record<string, string> = {
    emotional: t("love"),
    career: t("career"),
    wealth: t("wealth"),
    family: t("family"),
  };

  const form = useForm<MatchingForm>({
    resolver: zodResolver(matchingSchemaBase),
    defaultValues: {
      partnerNickname: "",
      partnerGender: "",
      partnerTimezone: "UTC+8",
      partnerBirthDate: "",
      partnerBirthTime: "",
      partnerBirthPlace: "",
      relationshipType: "romantic",
      selectedCulture: "none",
    },
  });

  const matchingMutation = useMutation({
    mutationFn: async (data: MatchingForm) => {
      const res = await apiRequest("POST", "/api/matchings", { ...data, language });
      if (res.status === 402) {
        const errorData = await res.json();
        throw { status: 402, ...errorData };
      }
      if (!res.ok) {
        throw new Error(t("matchingFailed"));
      }
      return res.json() as Promise<Matching>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matchings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stardust"] });
      // Store original content for global translation system
      lastMatchingIdRef.current = result.id;
      matchingGeneratedLangRef.current = language;
      setOriginalMatching(result, language);
      setCurrentResult(result);
      toast({ 
        title: t("matchingComplete"), 
        description: `${t("stardustRequired")} 20 ${t("stardust")}`,
      });
    },
    onError: (error: any) => {
      if (error?.status === 402) {
        toast({ 
          title: t("stardustInsufficient"), 
          description: `${t("stardustRequired")} 20 ${t("stardust")}，${t("stardustCurrent")} ${error.currentBalance || 0}`,
          variant: "destructive" 
        });
      } else {
        toast({ title: t("error"), description: t("matchingFailed"), variant: "destructive" });
      }
    },
  });

  const onSubmit = (data: MatchingForm) => {
    matchingMutation.mutate(data);
  };

  const mockResult: Matching = {
    id: 1,
    userId: "user1",
    partnerNickname: "小红",
    partnerGender: "female",
    partnerBirthDate: new Date("1995-06-15"),
    partnerBirthTime: "wu",
    partnerBirthPlace: "上海",
    partnerBaziChart: null,
    matchScore: 82,
    matchConclusion: "你们的组合在事业和财运方面相辅相成，感情上需要多一些理解和包容。",
    relationshipType: "romantic",
    dimensionAnalysis: {
      emotional: { score: 78, desc: "情感默契度较高，但需注意沟通方式" },
      career: { score: 88, desc: "事业上互相支持，能共同进步" },
      wealth: { score: 85, desc: "财运互补，理财观念需要调和" },
      family: { score: 75, desc: "家庭责任感都很强，分工明确" },
    },
    culturalInterpretation: "从中国洪荒神话角度看，你们如同共工与祝融，虽性格迥异但能量互补，碰撞出璀璨火花。",
    selectedCulture: "china",
    createdAt: new Date(),
  };

  const resolvedResult = currentResult || (history?.length ? history[0] : null) || mockResult;
  // Use translated matching from global translation system or fallback to current result
  const displayResult = (translatedMatching as Matching | null) || resolvedResult;

  return (
    <div className="relative space-y-6 p-6">
      {isTranslating && <TranslationOverlay />}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">{t("compatibility")}</h1>
        <p className="text-muted-foreground">{t("askCosmicQuestion")}</p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                {t("partnerInfo")}
              </CardTitle>
              <CardDescription>{t("birthInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="partnerNickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("partnerNickname")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("nickname")}
                            data-testid="input-partner-nickname"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="partnerGender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("partnerGender")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-partner-gender">
                                <SelectValue placeholder={t("selectGender")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">{t("male")}</SelectItem>
                              <SelectItem value="female">{t("female")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="relationshipType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("relationshipType")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-relationship-type">
                                <SelectValue placeholder={t("relationshipType")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {relationshipTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="partnerTimezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          {t("partnerTimezone")}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-partner-timezone">
                              <SelectValue placeholder={t("timezone")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timezoneOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {t(option.labelKey as any)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="partnerBirthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {t("partnerBirthDate")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            data-testid="input-partner-birth-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="partnerBirthTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {t("partnerBirthTime")}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-partner-birth-time">
                              <SelectValue placeholder={t("selectBirthTime")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {hourOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="partnerBirthPlace"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {t("partnerBirthPlace")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("enterBirthPlace")}
                            data-testid="input-partner-birth-place"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="selectedCulture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("culture")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-matching-culture">
                              <SelectValue placeholder={t("culture")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cultures.map((culture) => (
                              <SelectItem key={culture.value} value={culture.value}>
                                {culture.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={matchingMutation.isPending}
                    className="w-full gap-2"
                    data-testid="button-match-now"
                  >
                    {matchingMutation.isPending ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        {t("loading")}
                      </>
                    ) : (
                      <>
                        <Heart className="h-4 w-4" />
                        {t("matchNow")}
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {matchingMutation.isPending ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="mx-auto h-32 w-32 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ) : displayResult ? (
            <MaskedContent
              isLocked={isContentLocked(displayResult.id)}
              onUnlock={() => handleUnlock(displayResult.id)}
              isUnlocking={isUnlocking}
              cost={20}
            >
              <Card className="overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-pink-900/10">
                <CardContent className="flex flex-col items-center p-8">
                  <div className="relative mb-4 flex h-36 w-36 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-20 blur-xl" />
                    <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-pink-500/50 bg-background/80">
                      <span className={`text-3xl font-bold ${getScoreColor(displayResult.matchScore || 0)}`}>
                        {displayResult.matchScore}
                      </span>
                      <span className="text-xs text-muted-foreground text-center px-1">{t("overallMatch")}</span>
                    </div>
                  </div>
                  <Badge className="mb-4 bg-gradient-to-r from-purple-500 to-pink-500">
                    {getScoreLabel(displayResult.matchScore || 0)}
                  </Badge>
                  <p className="text-center text-foreground/80">{displayResult.matchConclusion}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("matchingResult")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(
                    (displayResult.dimensionAnalysis as Record<string, { score: number; desc: string }>) || mockResult.dimensionAnalysis!
                  ).map(([key, value]) => {
                    const icons: Record<string, typeof Heart> = {
                      emotional: Heart,
                      career: TrendingUp,
                      wealth: Zap,
                      family: Shield,
                    };
                    const Icon = icons[key] || Heart;
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{dimensionLabels[key] || key}</span>
                          </div>
                          <span className={`font-bold ${getScoreColor(value.score)}`}>
                            {value.score}
                          </span>
                        </div>
                        <Progress value={value.score} className="h-2" />
                        <p className="text-xs text-muted-foreground">{value.desc}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-amber-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-amber-400" />
                    {t("culture")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/80">
                    {displayResult.culturalInterpretation || mockResult.culturalInterpretation}
                  </p>
                </CardContent>
              </Card>
            </MaskedContent>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
