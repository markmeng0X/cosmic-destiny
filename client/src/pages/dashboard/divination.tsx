import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ttqTrackViewContent } from "@/lib/tiktok-pixel";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sparkles,
  Send,
  History,
  MessageCircle,
  Star,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useStardust } from "@/hooks/use-stardust";
import { useCoordinatedTranslation } from "@/hooks/use-coordinated-translation";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Divination } from "@shared/schema";
import { STARDUST_COSTS } from "@shared/schema";

const questionSchema = z.object({
  question: z.string().min(5),
  questionType: z.string().min(1),
  culture: z.string(),
  divinationModel: z.string().min(1),
});

type QuestionForm = z.infer<typeof questionSchema>;

export default function DivinationPage() {
  const { t, language } = useI18n();
  const { toast } = useToast();
  const { startTranslation, endTranslation } = useCoordinatedTranslation();
  const [currentResult, setCurrentResult] = useState<Divination | null>(null);
  const { consumeForAction, balance } = useStardust();

  useEffect(() => {
    ttqTrackViewContent({ contentId: "divination", contentName: "AI Divination", contentCategory: "divination" });
  }, []);

  // Store original content to avoid translation drift
  const originalContentRef = useRef<{
    result: string | null;
    advice: string | null;
    keyPoints: string[] | null;
    generatedLang: string;
  }>({ result: null, advice: null, keyPoints: null, generatedLang: language });
  
  // Track last translated language to prevent infinite loops
  const lastTranslatedLangRef = useRef<string>(language);

  // Translate divination result when language changes
  useEffect(() => {
    // Skip if same as original or already translated to this language
    if (!currentResult?.result || language === originalContentRef.current.generatedLang || language === lastTranslatedLangRef.current) return;
    
    const translateDivination = async () => {
      startTranslation();
      try {
        // Translate result
        if (originalContentRef.current.result) {
          const res = await apiRequest("POST", "/api/translate/divination", { 
            response: originalContentRef.current.result, 
            targetLanguage: language 
          });
          if (res.ok) {
            const translated = await res.json();
            setCurrentResult(prev => prev ? { ...prev, result: translated.response } : null);
          }
        }
        
        // Translate advice if exists
        if (originalContentRef.current.advice) {
          const adviceRes = await apiRequest("POST", "/api/translate/divination", { 
            response: originalContentRef.current.advice, 
            targetLanguage: language 
          });
          if (adviceRes.ok) {
            const translatedAdvice = await adviceRes.json();
            setCurrentResult(prev => prev ? { ...prev, advice: translatedAdvice.response } : null);
          }
        }
        
        // Translate keyPoints if exist
        if (originalContentRef.current.keyPoints && originalContentRef.current.keyPoints.length > 0) {
          const translatedKeyPoints: string[] = [];
          for (const keyPoint of originalContentRef.current.keyPoints) {
            const kpRes = await apiRequest("POST", "/api/translate/divination", { 
              response: keyPoint, 
              targetLanguage: language 
            });
            if (kpRes.ok) {
              const translatedKp = await kpRes.json();
              translatedKeyPoints.push(translatedKp.response);
            } else {
              translatedKeyPoints.push(keyPoint);
            }
          }
          setCurrentResult(prev => prev ? { ...prev, keyPoints: translatedKeyPoints } : null);
        }
        
        lastTranslatedLangRef.current = language;
      } catch (error) {
        console.error("Translation error:", error);
      } finally {
        endTranslation();
      }
    };
    
    translateDivination();
  }, [language, startTranslation, endTranslation]);

  const divinationModels = [
    { value: "liuyao", label: t("liuyao"), desc: t("liuyaoDesc") },
    { value: "meihua", label: t("meihua"), desc: t("meihuaDesc") },
  ];

  const questionTypes = [
    { value: "career", label: t("careerWork") },
    { value: "love", label: t("loveRelationship") },
    { value: "wealth", label: t("wealthInvestment") },
    { value: "health", label: t("healthWellness") },
    { value: "study", label: t("studyExam") },
    { value: "general", label: t("generalQuery") },
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

  const { data: history, isLoading: historyLoading } = useQuery<Divination[]>({
    queryKey: ["/api/divinations"],
  });

  const form = useForm<QuestionForm>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question: "",
      questionType: "",
      culture: "none",
      divinationModel: "liuyao",
    },
  });

  const divinationMutation = useMutation({
    mutationFn: async (data: QuestionForm) => {
      const canProceed = await consumeForAction("api_call_ai_deep_query");
      if (!canProceed) {
        throw new Error(t("stardustInsufficient"));
      }
      const res = await apiRequest("POST", "/api/divinations", { ...data, language });
      return res.json() as Promise<Divination>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/divinations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stardust"] });
      setCurrentResult(result);
      originalContentRef.current = {
        result: result.result,
        advice: result.advice,
        keyPoints: result.keyPoints as string[] | null,
        generatedLang: language,
      };
      lastTranslatedLangRef.current = language;
      form.reset();
      toast({ title: t("success"), description: t("divinationComplete") });
    },
    onError: () => {
      toast({ title: t("error"), description: t("divinationFailed"), variant: "destructive" });
    },
  });

  const onSubmit = (data: QuestionForm) => {
    divinationMutation.mutate(data);
  };

  const mockResult: Divination = {
    id: 1,
    userId: "user1",
    question: "最近的事业发展如何？",
    questionType: "career",
    divinationModel: "liuyao",
    result: "乾卦变坤卦，事业正处于转型期。目前的困难是暂时的，坚持正道必有回报。",
    keyPoints: ["贵人将至", "宜守不宜进", "下月转运"],
    advice: "保持耐心，积累实力，时机成熟自然水到渠成。建议多与前辈交流，学习经验。",
    createdAt: new Date(),
  };

  const displayResult = currentResult || (history?.length ? history[0] : null);

  return (
    <div className="flex h-full gap-6 p-6">
      <div className="flex-1 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold">{t("aiDivination")}</h1>
          <p className="text-muted-foreground">{t("askCosmicQuestion")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-purple-400" />
                {t("askQuestion")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="question"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("yourQuestion")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("questionPlaceholder")}
                            className="min-h-24 resize-none"
                            data-testid="textarea-question"
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
                      name="questionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("questionType")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-question-type">
                                <SelectValue placeholder={t("questionType")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {questionTypes.map((type) => (
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

                    <FormField
                      control={form.control}
                      name="culture"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("culture")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-culture">
                                <SelectValue placeholder={t("culture")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cultures.map((culture) => (
                                <SelectItem key={culture.value} value={culture.value}>
                                  <div className="flex flex-col">
                                    <span>{culture.label}</span>
                                  </div>
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
                    name="divinationModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("divinationModel")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-divination-model">
                              <SelectValue placeholder={t("divinationModel")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {divinationModels.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                <div className="flex flex-col">
                                  <span>{model.label}</span>
                                </div>
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
                    disabled={divinationMutation.isPending}
                    className="w-full gap-2"
                    data-testid="button-submit-divination"
                  >
                    {divinationMutation.isPending ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        {t("loading")}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {t("submit")}
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>

        {(displayResult || divinationMutation.isPending) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-cyan-900/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  {t("divinationResult")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {divinationMutation.isPending ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : displayResult ? (
                  <>
                    <div className="rounded-lg bg-muted/30 p-4">
                      <p className="text-sm text-muted-foreground">{t("yourQuestion")}</p>
                      <p className="font-medium">{displayResult.question}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t("hexagramReading")}</p>
                      <p className="text-foreground/80">{displayResult.result || mockResult.result}</p>
                    </div>

                    {(displayResult.keyPoints || mockResult.keyPoints) && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{t("keyPoints")}</p>
                        <div className="flex flex-wrap gap-2">
                          {((displayResult.keyPoints as string[]) || (mockResult.keyPoints as string[]))?.map((point, i) => (
                            <Badge key={i} variant="secondary" className="bg-purple-500/20">
                              <Star className="mr-1 h-3 w-3" />
                              {point}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t("advice")}</p>
                      <p className="text-foreground/80">{displayResult.advice || mockResult.advice}</p>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="hidden w-80 lg:block"
      >
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-4 w-4" />
              {t("divinationHistory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {historyLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : history?.length ? (
                <div className="space-y-3">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentResult(item)}
                      className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                      data-testid={`history-item-${item.id}`}
                    >
                      <p className="line-clamp-2 text-sm font-medium">{item.question}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
                  <MessageCircle className="mb-2 h-8 w-8" />
                  <p className="text-sm">{t("noDivinationHistory")}</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
