import { useState, useEffect, useRef, useMemo } from "react";
import { ttqTrackViewContent } from "@/lib/tiktok-pixel";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Info,
  RotateCcw,
  ChevronRight,
  Zap,
  Star,
  Flame,
  Droplets,
  Mountain,
  Leaf,
  Scroll,
  Sword,
  Castle,
  Circle,
  Moon,
  Bolt,
  Shield,
  Wind,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpandableText } from "@/components/ui/expandable-text";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useGlobalTranslation, setOriginalBaziContent } from "@/hooks/use-global-translation";
import { TranslationOverlay } from "@/components/translation-skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { BaziChart, UserProfile, Subscription } from "@shared/schema";
import { Lock } from "lucide-react";

const createBirthInfoSchema = (t: (key: string) => string) => z.object({
  birthDate: z.string().min(1, { message: t("birthDateRequired") }),
  birthTime: z.string().min(1, { message: t("birthTimeRequired") }),
  birthPlace: z.string().min(1, { message: t("birthPlaceRequired") }),
  gender: z.string().min(1, { message: t("genderRequired") }),
});

type BirthInfoForm = {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  gender: string;
};

const hourOptionsBase = [
  { value: "zi", labelKey: "hourZi" as const },
  { value: "chou", labelKey: "hourChou" as const },
  { value: "yin", labelKey: "hourYin" as const },
  { value: "mao", labelKey: "hourMao" as const },
  { value: "chen", labelKey: "hourChen" as const },
  { value: "si", labelKey: "hourSi" as const },
  { value: "wu", labelKey: "hourWu" as const },
  { value: "wei", labelKey: "hourWei" as const },
  { value: "shen", labelKey: "hourShen" as const },
  { value: "you", labelKey: "hourYou" as const },
  { value: "xu", labelKey: "hourXu" as const },
  { value: "hai", labelKey: "hourHai" as const },
];

const culturalSystemsBase = [
  { id: "none", nameKey: "noCulture" as const, Icon: null },
  { id: "chinese", nameKey: "chinaMyth" as const, Icon: Scroll },
  { id: "japanese", nameKey: "japanRpg" as const, Icon: Sword },
  { id: "western", nameKey: "westernFantasy" as const, Icon: Castle },
  { id: "buddhist", nameKey: "buddhist" as const, Icon: Circle },
  { id: "arabic", nameKey: "arabic" as const, Icon: Moon },
  { id: "pokemon", nameKey: "pokemon" as const, Icon: Bolt },
  { id: "marvel", nameKey: "marvel" as const, Icon: Shield },
  { id: "genshin", nameKey: "genshin" as const, Icon: Wind },
];

const elementIcons: Record<string, typeof Flame> = {
  木: Leaf,
  火: Flame,
  土: Mountain,
  金: Star,
  水: Droplets,
};

const elementColors: Record<string, string> = {
  木: "text-green-400",
  火: "text-red-400",
  土: "text-amber-400",
  金: "text-slate-300",
  水: "text-blue-400",
};

const stemElements: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水"
};

interface HiddenStemInfo {
  stem: string;
  tenGod: string;
  percentage: number;
}

interface PillarInfo {
  stem: string;
  branch: string;
  stemTenGod: string;
  hiddenStems: HiddenStemInfo[];
}

interface GrandLuckPeriod {
  startAge: number;
  endAge: number;
  stem: string;
  branch: string;
  hiddenStems: HiddenStemInfo[];
  startYear: number;
  endYear: number;
}

interface YearlyFortune {
  year: number;
  age: number;
  stem: string;
  branch: string;
  tenGod: string;
}

interface ExtendedBaziChart {
  yearPillar?: PillarInfo;
  monthPillar?: PillarInfo;
  dayPillar?: PillarInfo;
  hourPillar?: PillarInfo;
  yearStem: string;
  yearBranch: string;
  monthStem: string;
  monthBranch: string;
  dayStem: string;
  dayBranch: string;
  hourStem: string;
  hourBranch: string;
  yearTenGod: string;
  monthTenGod: string;
  hourTenGod: string;
  dayMasterElement?: string;
  dayMasterPolarity?: string;
  dayMasterElementDesc?: string;
  favorableGod?: string;
  favorableGodDesc?: string;
  avoidGod?: string;
  avoidGodDesc?: string;
  grandLuck?: GrandLuckPeriod[];
  yearlyFortunes?: YearlyFortune[];
  bodyStrength: number;
  bodyStrengthLevel: string;
  bodyStrengthDesc?: string;
  destinyPattern: string;
  destinyPatternDesc: string;
  birthYear?: number;
  gender?: string;
  unlockedGrandLuck?: Record<string, string | MultiLangInterpretation>;
  unlockedYearlyFortunes?: Record<string, string | MultiLangInterpretation>;
}

// Multi-language interpretation type for instant switching
interface MultiLangInterpretation {
  zh: string;
  en: string;
  ja: string;
  ko: string;
}

interface CulturalInterpretation {
  dayMasterDesc: string;
  favorableGodDesc: string;
  avoidGodDesc: string;
  bodyStrengthDesc: string;
  destinyPatternDesc: string;
  grandLuckDesc: string;
  yearlyFortuneDesc: string;
}

export default function BaziPage() {
  const { t, language } = useI18n();
  const { toast } = useToast();
  const { 
    translatedBaziChart, 
    translatedCulturalInterpretation, 
    translatedGrandLuckInterpretation, 
    translatedYearlyInterpretation,
    isTranslating
  } = useGlobalTranslation();
  useEffect(() => {
    ttqTrackViewContent({ contentId: "bazi", contentName: "BaZi Chart", contentCategory: "astrology" });
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [selectedCulture, setSelectedCulture] = useState("none");
  const [selectedGrandLuck, setSelectedGrandLuck] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [culturalInterpretation, setCulturalInterpretation] = useState<CulturalInterpretation | null>(null);
  const [grandLuckInterpretation, setGrandLuckInterpretation] = useState<string>("");
  const [yearlyInterpretation, setYearlyInterpretation] = useState<string>("");
  const [unlockedGrandLuck, setUnlockedGrandLuck] = useState<Record<string, string | MultiLangInterpretation>>({});
  const [unlockedYearlyFortunes, setUnlockedYearlyFortunes] = useState<Record<string, string | MultiLangInterpretation>>({});
  
  // Helper to extract correct language from interpretation (string or multi-lang object)
  const getInterpretationForLang = (interpretation: string | MultiLangInterpretation | undefined, lang: string): string => {
    if (!interpretation) return "";
    if (typeof interpretation === "string") return interpretation;
    // Multi-language object - extract the correct language
    return (interpretation as MultiLangInterpretation)[lang as keyof MultiLangInterpretation] || interpretation.zh || "";
  };
  const [pendingReadingType, setPendingReadingType] = useState<"grandLuck" | "yearlyFortune" | null>(null);
  const [showGeneratingDialog, setShowGeneratingDialog] = useState(false);
  
  const stripMarkdown = (text: string): string => {
    if (!text) return text;
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/【([^】]+)】/g, '$1：')
      .replace(/\[([^\]]+)\]/g, '$1');
  };

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: baziChart, isLoading: chartLoading } = useQuery<ExtendedBaziChart>({
    queryKey: ["/api/bazi-chart"],
  });

  const { data: subscription } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
  });

  const isFreeTier = !subscription || subscription.tier === "free";

  const lastBaziChartRef = useRef<string | null>(null);
  const baziGeneratedLangRef = useRef<string>("zh");

  useEffect(() => {
    const chartKey = baziChart ? `${baziChart.dayStem}-${baziChart.dayBranch}` : null;
    if (baziChart && chartKey !== lastBaziChartRef.current) {
      lastBaziChartRef.current = chartKey;
      baziGeneratedLangRef.current = "zh";
      setOriginalBaziContent({ baziChart }, "zh");
      
      // Load persisted unlocked interpretations (supports both string and multi-lang formats)
      if (baziChart.unlockedGrandLuck) {
        setUnlockedGrandLuck(baziChart.unlockedGrandLuck as Record<string, string | MultiLangInterpretation>);
      }
      if (baziChart.unlockedYearlyFortunes) {
        setUnlockedYearlyFortunes(baziChart.unlockedYearlyFortunes as Record<string, string | MultiLangInterpretation>);
      }
    }
  }, [baziChart]);

  // Update current display when language changes (instant switching for multi-lang data)
  useEffect(() => {
    if (selectedGrandLuck !== null && baziChart?.grandLuck) {
      const grandLuckArray = baziChart.grandLuck as GrandLuckPeriod[];
      const selectedPeriod = grandLuckArray[selectedGrandLuck];
      if (selectedPeriod) {
        // Use startAge-endAge format to match how data is stored in onSuccess
        const baseKey = `${selectedPeriod.startAge}-${selectedPeriod.endAge}`;
        const cultureKey = selectedCulture && selectedCulture !== "none" 
          ? `${baseKey}_${selectedCulture}` 
          : baseKey;
        const interpretation = unlockedGrandLuck[cultureKey] || unlockedGrandLuck[baseKey];
        if (interpretation) {
          const langText = getInterpretationForLang(interpretation, language);
          setGrandLuckInterpretation(stripMarkdown(langText));
        }
      }
    }
  }, [language, selectedGrandLuck, unlockedGrandLuck, selectedCulture, baziChart]);

  useEffect(() => {
    // Use year format to match how data is stored in onSuccess (e.g., "2025" or "2025_chinese")
    const baseKey = String(selectedYear);
    const cultureKey = selectedCulture && selectedCulture !== "none" 
      ? `${baseKey}_${selectedCulture}` 
      : baseKey;
    const interpretation = unlockedYearlyFortunes[cultureKey] || unlockedYearlyFortunes[baseKey];
    if (interpretation) {
      const langText = getInterpretationForLang(interpretation, language);
      setYearlyInterpretation(stripMarkdown(langText));
    }
  }, [language, selectedYear, unlockedYearlyFortunes, selectedCulture]);

  const culturalMutation = useMutation({
    mutationFn: async ({ culture, selectedYear }: { culture: string; selectedYear: number }) => {
      const res = await apiRequest("POST", "/api/bazi-chart/cultural-interpretation", { culture, selectedYear, language });
      if (!res.ok) {
        const error = await res.json();
        if (res.status === 403) {
          throw new Error(error.message || t("paidMembersOnly"));
        }
        if (res.status === 402) {
          throw new Error(t("stardustInsufficient"));
        }
        throw new Error(error.message || t("generateFailed"));
      }
      return res.json();
    },
    onSuccess: (data: CulturalInterpretation) => {
      setCulturalInterpretation(data);
      setOriginalBaziContent({ culturalInterpretation: data }, language);
      queryClient.invalidateQueries({ queryKey: ["/api/stardust"] });
      toast({ title: t("cultureInterpretationGenerated"), description: t("stardustConsumed") });
    },
    onError: (error: Error) => {
      toast({ title: t("generateFailed"), description: error.message, variant: "destructive" });
    },
  });
  
  const deepReadingMutation = useMutation({
    mutationFn: async ({ type, data, culture }: { type: "grandLuck" | "yearlyFortune"; data: any; culture?: string }) => {
      setPendingReadingType(type);
      setShowGeneratingDialog(true);
      // Use multilang endpoint for instant language switching
      const res = await apiRequest("POST", "/api/bazi-chart/deep-reading-multilang", { type, data, culture: culture || selectedCulture });
      if (!res.ok) {
        const error = await res.json();
        if (res.status === 403) {
          throw new Error(error.message || t("paidMembersOnly"));
        }
        if (res.status === 402) {
          throw new Error(t("stardustInsufficient"));
        }
        throw new Error(error.message || t("generateFailed"));
      }
      return res.json();
    },
    onSuccess: (data: { type: string; interpretation: MultiLangInterpretation; dataKey: string; newBalance: number }) => {
      setPendingReadingType(null);
      setShowGeneratingDialog(false);
      // Get interpretation for current language and clean it
      const currentLangInterpretation = stripMarkdown(getInterpretationForLang(data.interpretation, language));
      if (data.type === "grandLuck") {
        setGrandLuckInterpretation(currentLangInterpretation);
        setOriginalBaziContent({ grandLuckInterpretation: currentLangInterpretation }, language);
        const cultureKey = selectedCulture && selectedCulture !== "none" ? `${data.dataKey}_${selectedCulture}` : data.dataKey;
        // Store the full multi-lang object for instant language switching
        setUnlockedGrandLuck(prev => ({ ...prev, [cultureKey]: data.interpretation }));
      } else if (data.type === "yearlyFortune") {
        setYearlyInterpretation(currentLangInterpretation);
        setOriginalBaziContent({ yearlyInterpretation: currentLangInterpretation }, language);
        const cultureKey = selectedCulture && selectedCulture !== "none" ? `${data.dataKey}_${selectedCulture}` : data.dataKey;
        // Store the full multi-lang object for instant language switching
        setUnlockedYearlyFortunes(prev => ({ ...prev, [cultureKey]: data.interpretation }));
      }
      queryClient.invalidateQueries({ queryKey: ["/api/stardust"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bazi-chart"] });
      toast({ title: t("deepReadingGenerated"), description: t("stardustConsumed") });
    },
    onError: (error: Error) => {
      setPendingReadingType(null);
      setShowGeneratingDialog(false);
      toast({ title: t("generateFailed"), description: error.message, variant: "destructive" });
    },
  });

  const handleCultureChange = (culture: string) => {
    setSelectedCulture(culture);
    if (culture && culture !== "none") {
      culturalMutation.mutate({ culture, selectedYear });
    } else {
      setCulturalInterpretation(null);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    if (selectedCulture && selectedCulture !== "none") {
      culturalMutation.mutate({ culture: selectedCulture, selectedYear: year });
    }
    // Load saved yearly interpretation if exists - check culture-specific key first
    const baseKey = String(year);
    const cultureKey = selectedCulture && selectedCulture !== "none" 
      ? `${baseKey}_${selectedCulture}` 
      : baseKey;
    const interpretation = unlockedYearlyFortunes[cultureKey] || unlockedYearlyFortunes[baseKey];
    if (interpretation) {
      setYearlyInterpretation(getInterpretationForLang(interpretation, language));
    } else {
      setYearlyInterpretation("");
    }
  };

  const hourOptions = hourOptionsBase.map(opt => ({
    value: opt.value,
    label: t(opt.labelKey),
  }));

  const culturalSystems = culturalSystemsBase.map(sys => ({
    id: sys.id,
    name: t(sys.nameKey),
    Icon: sys.Icon,
  }));

  const birthInfoSchema = useMemo(() => createBirthInfoSchema(t as (key: string) => string), [t]);
  
  const form = useForm<BirthInfoForm>({
    resolver: zodResolver(birthInfoSchema),
    defaultValues: {
      birthDate: "",
      birthTime: "",
      birthPlace: "",
      gender: "",
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (data: BirthInfoForm) => {
      const res = await apiRequest("POST", "/api/bazi-chart/calculate", data);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: t("calculationFailed") }));
        throw new Error(errorData.message || t("calculationFailed"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bazi-chart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: t("success"), description: t("baziCalculationComplete") });
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: t("error"), 
        description: error.message || t("calculationFailed"), 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: BirthInfoForm) => {
    calculateMutation.mutate(data);
  };

  const mockChart: ExtendedBaziChart = {
    yearPillar: {
      stem: "乙",
      branch: "巳",
      stemTenGod: "正印",
      hiddenStems: [
        { stem: "丙", tenGod: "比肩", percentage: 60 },
        { stem: "庚", tenGod: "偏财", percentage: 30 },
        { stem: "戊", tenGod: "食神", percentage: 10 },
      ],
    },
    monthPillar: {
      stem: "戊",
      branch: "子",
      stemTenGod: "食神",
      hiddenStems: [{ stem: "癸", tenGod: "正官", percentage: 100 }],
    },
    dayPillar: {
      stem: "丙",
      branch: "子",
      stemTenGod: "日主",
      hiddenStems: [{ stem: "癸", tenGod: "正官", percentage: 100 }],
    },
    hourPillar: {
      stem: "癸",
      branch: "巳",
      stemTenGod: "正官",
      hiddenStems: [
        { stem: "丙", tenGod: "比肩", percentage: 60 },
        { stem: "庚", tenGod: "偏财", percentage: 30 },
        { stem: "戊", tenGod: "食神", percentage: 10 },
      ],
    },
    yearStem: "乙",
    yearBranch: "巳",
    monthStem: "戊",
    monthBranch: "子",
    dayStem: "丙",
    dayBranch: "子",
    hourStem: "癸",
    hourBranch: "巳",
    yearTenGod: "正印",
    monthTenGod: "食神",
    hourTenGod: "正官",
    dayMasterElement: "火",
    dayMasterPolarity: "阳",
    dayMasterElementDesc: "火主礼，代表热情、光明。性格热情开朗，积极进取，具有领导力和感染力。",
    favorableGod: "土金",
    favorableGodDesc: "身强宜用财官。土为财星，可耗身生财；金为官杀，可约束规范。水为食伤，可泄秀生财。",
    avoidGod: "木火",
    avoidGodDesc: "身强忌印比。木为印星，会使日主更强；火为比劫，加重身旺之势。",
    grandLuck: [
      { startAge: 3, endAge: 12, stem: "己", branch: "丑", hiddenStems: [{ stem: "己", tenGod: "伤官", percentage: 60 }, { stem: "癸", tenGod: "正官", percentage: 30 }, { stem: "辛", tenGod: "正财", percentage: 10 }], startYear: 1988, endYear: 1997 },
      { startAge: 13, endAge: 22, stem: "庚", branch: "寅", hiddenStems: [{ stem: "甲", tenGod: "偏印", percentage: 60 }, { stem: "丙", tenGod: "比肩", percentage: 30 }, { stem: "戊", tenGod: "食神", percentage: 10 }], startYear: 1998, endYear: 2007 },
      { startAge: 23, endAge: 32, stem: "辛", branch: "卯", hiddenStems: [{ stem: "乙", tenGod: "正印", percentage: 100 }], startYear: 2008, endYear: 2017 },
      { startAge: 33, endAge: 42, stem: "壬", branch: "辰", hiddenStems: [{ stem: "戊", tenGod: "食神", percentage: 60 }, { stem: "乙", tenGod: "正印", percentage: 30 }, { stem: "癸", tenGod: "正官", percentage: 10 }], startYear: 2018, endYear: 2027 },
      { startAge: 43, endAge: 52, stem: "癸", branch: "巳", hiddenStems: [{ stem: "丙", tenGod: "比肩", percentage: 60 }, { stem: "庚", tenGod: "偏财", percentage: 30 }, { stem: "戊", tenGod: "食神", percentage: 10 }], startYear: 2028, endYear: 2037 },
      { startAge: 53, endAge: 62, stem: "甲", branch: "午", hiddenStems: [{ stem: "丁", tenGod: "劫财", percentage: 70 }, { stem: "己", tenGod: "伤官", percentage: 30 }], startYear: 2038, endYear: 2047 },
      { startAge: 63, endAge: 72, stem: "乙", branch: "未", hiddenStems: [{ stem: "己", tenGod: "伤官", percentage: 60 }, { stem: "丁", tenGod: "劫财", percentage: 30 }, { stem: "乙", tenGod: "正印", percentage: 10 }], startYear: 2048, endYear: 2057 },
      { startAge: 73, endAge: 82, stem: "丙", branch: "申", hiddenStems: [{ stem: "庚", tenGod: "偏财", percentage: 60 }, { stem: "壬", tenGod: "七杀", percentage: 30 }, { stem: "戊", tenGod: "食神", percentage: 10 }], startYear: 2058, endYear: 2067 },
    ],
    yearlyFortunes: [
      { year: 2024, age: 39, stem: "甲", branch: "辰", tenGod: "偏印" },
      { year: 2025, age: 40, stem: "乙", branch: "巳", tenGod: "正印" },
      { year: 2026, age: 41, stem: "丙", branch: "午", tenGod: "比肩" },
      { year: 2027, age: 42, stem: "丁", branch: "未", tenGod: "劫财" },
      { year: 2028, age: 43, stem: "戊", branch: "申", tenGod: "食神" },
      { year: 2029, age: 44, stem: "己", branch: "酉", tenGod: "伤官" },
      { year: 2030, age: 45, stem: "庚", branch: "戌", tenGod: "偏财" },
      { year: 2031, age: 46, stem: "辛", branch: "亥", tenGod: "正财" },
      { year: 2032, age: 47, stem: "壬", branch: "子", tenGod: "七杀" },
      { year: 2033, age: 48, stem: "癸", branch: "丑", tenGod: "正官" },
    ],
    bodyStrength: 6.5,
    bodyStrengthLevel: "身强",
    bodyStrengthDesc: "日主能量充足，自信有主见，适合独立发展。宜用财官，忌印比过重。",
    destinyPattern: "七杀格",
    destinyPatternDesc: "具有开拓进取的精神，适合竞争性强的领域。",
    birthYear: 1985,
    gender: "male",
  };

  const originalChart = baziChart || mockChart;
  const displayChart = (translatedBaziChart as ExtendedBaziChart | undefined) || baziChart || mockChart;
  const displayCulturalInterpretation = (typeof translatedCulturalInterpretation === 'object' && translatedCulturalInterpretation !== null 
    ? translatedCulturalInterpretation 
    : culturalInterpretation) as CulturalInterpretation | null;
  const displayGrandLuckInterpretation = (translatedGrandLuckInterpretation as string | null) || grandLuckInterpretation;
  const displayYearlyInterpretation = (translatedYearlyInterpretation as string | null) || yearlyInterpretation;

  if (profileLoading || chartLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const hasBirthInfo = profile?.birthDate && profile?.birthTime;

  if (!hasBirthInfo || showForm) {
    return (
      <div className="space-y-6 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold">{t("baziReading")}</h1>
          <p className="text-muted-foreground">{t("completeBirthInfoForBazi")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                {t("birthInfo")}
              </CardTitle>
              <CardDescription>
                {t("birthInfoDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {t("birthDate")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            data-testid="input-birth-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="birthTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {t("birthTime")}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-birth-time">
                              <SelectValue placeholder={t("selectBirthTime")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {hourOptions.map((option: { value: string; label: string }) => (
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
                    name="birthPlace"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {t("birthPlace")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("enterBirthPlace")}
                            data-testid="input-birth-place"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("gender")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-gender">
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

                  <div className="flex gap-2 pt-4">
                    {showForm && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForm(false)}
                        data-testid="button-cancel"
                      >
                        {t("cancel")}
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={calculateMutation.isPending}
                      data-testid="button-calculate-bazi"
                    >
                      {calculateMutation.isPending ? t("loading") : t("calculateBazi")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const pillars = [
    { title: t("yearPillar"), pillar: displayChart.yearPillar || { stem: displayChart.yearStem, branch: displayChart.yearBranch, stemTenGod: displayChart.yearTenGod, hiddenStems: [] } },
    { title: t("monthPillar"), pillar: displayChart.monthPillar || { stem: displayChart.monthStem, branch: displayChart.monthBranch, stemTenGod: displayChart.monthTenGod, hiddenStems: [] } },
    { title: t("dayPillar"), pillar: displayChart.dayPillar || { stem: displayChart.dayStem, branch: displayChart.dayBranch, stemTenGod: "日主", hiddenStems: [] } },
    { title: t("hourPillar"), pillar: displayChart.hourPillar || { stem: displayChart.hourStem, branch: displayChart.hourBranch, stemTenGod: displayChart.hourTenGod, hiddenStems: [] } },
  ];

  const currentGrandLuck = selectedGrandLuck !== null ? displayChart.grandLuck?.[selectedGrandLuck] : null;
  const currentYear = new Date().getFullYear();

  return (
    <div className="relative space-y-6 p-6">
      {isTranslating && <TranslationOverlay />}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("baziReading")}</h1>
          <p className="text-muted-foreground">{t("birthInfoDesc")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isFreeTier ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" className="min-w-[160px] justify-start opacity-60 whitespace-nowrap" disabled data-testid="select-culture-locked">
                  <Lock className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{t("cultureInterpretationLocked")}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("upgradeToUnlock")}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Select value={selectedCulture} onValueChange={handleCultureChange}>
              <SelectTrigger className="min-w-[160px] w-auto" data-testid="select-culture">
                <SelectValue placeholder={t("culture")} />
              </SelectTrigger>
              <SelectContent>
                {culturalSystems.map((culture) => (
                  <SelectItem key={culture.id} value={culture.id}>
                    <div className="flex items-center gap-2">
                      {culture.Icon && <culture.Icon className="h-4 w-4" />}
                      <span>{culture.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            className="whitespace-nowrap"
            data-testid="button-recalculate"
          >
            <RotateCcw className="mr-2 h-4 w-4 flex-shrink-0" />
            {t("refresh")}
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-hidden border-purple-500/20 max-w-4xl">
          <CardHeader className="bg-gradient-to-r from-purple-900/40 to-cyan-900/20">
            <CardTitle>{t("fourPillars")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-sm text-muted-foreground">{t("pillar")}</th>
                    {pillars.map((p) => (
                      <th key={p.title} className="px-4 py-3 text-sm font-normal text-muted-foreground">
                        {p.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10">
                    <td className="px-4 py-2 text-left text-sm text-purple-300">{t("tenGods")}</td>
                    {pillars.map((p) => (
                      <td key={`${p.title}-tengod`} className="px-4 py-2">
                        <span className={`text-sm ${p.pillar.stemTenGod === "日主" ? "text-amber-400" : "text-purple-300"}`}>
                          {p.pillar.stemTenGod}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="px-4 py-2 text-left text-sm text-muted-foreground">{t("heavenlyStem")}</td>
                    {pillars.map((p) => {
                      const element = stemElements[p.pillar.stem];
                      const colorClass = elementColors[element];
                      return (
                        <td key={`${p.title}-stem`} className="px-4 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-3xl font-bold ${colorClass}`} data-testid={`text-stem-${p.title}`}>
                              {p.pillar.stem}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="px-4 py-2 text-left text-sm text-muted-foreground">{t("earthlyBranch")}</td>
                    {pillars.map((p) => (
                      <td key={`${p.title}-branch`} className="px-4 py-3">
                        <span className="text-3xl font-bold text-cyan-300" data-testid={`text-branch-${p.title}`}>
                          {p.pillar.branch}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="px-4 py-2 text-left text-sm text-muted-foreground">{t("hiddenStems")}</td>
                    {pillars.map((p) => (
                      <td key={`${p.title}-hidden`} className="px-4 py-2">
                        <div className="flex flex-col items-center gap-0.5">
                          {p.pillar.hiddenStems.map((hs, idx) => {
                            const element = stemElements[hs.stem];
                            const colorClass = elementColors[element];
                            return (
                              <span key={idx} className={`text-sm ${colorClass}`}>
                                {hs.stem}{element}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-left text-sm text-muted-foreground">{t("tenGods")}</td>
                    {pillars.map((p) => (
                      <td key={`${p.title}-secondary`} className="px-4 py-2">
                        <div className="flex flex-col items-center gap-0.5">
                          {p.pillar.hiddenStems.map((hs, idx) => (
                            <span key={idx} className="text-xs text-muted-foreground">
                              {hs.tenGod}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t("dayMaster")} {t("element")}
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{t("dayMasterTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {originalChart.dayMasterElement && (() => {
                  const ElementIcon = elementIcons[originalChart.dayMasterElement];
                  const colorClass = elementColors[originalChart.dayMasterElement];
                  if (!ElementIcon) return null;
                  return (
                    <>
                      <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ${colorClass}`}>
                        <ElementIcon className="h-8 w-8" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-purple-500">{displayChart.dayMasterPolarity}{displayChart.dayMasterElement}</Badge>
                          <span className="text-lg font-bold">{displayChart.dayStem} {t("dayMaster")}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-day-master-desc">
                {displayCulturalInterpretation?.dayMasterDesc || displayChart?.dayMasterElementDesc}
              </p>
              {culturalMutation.isPending && <Skeleton className="h-4 w-full mt-2" />}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t("favorableGodLabel")}
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{t("favorableGodTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Badge className="bg-green-600" data-testid="text-favorable-god">{t("favorablePrefix")}{displayChart?.favorableGod}</Badge>
                  <Badge variant="destructive" data-testid="text-avoid-god">{t("avoidPrefix")}{displayChart?.avoidGod}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-favorable-desc">
                {displayCulturalInterpretation?.favorableGodDesc || displayChart?.favorableGodDesc}
              </p>
              {culturalMutation.isPending && <Skeleton className="h-4 w-full mt-2" />}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t("bodyStrengthLabel")}
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{t("bodyStrengthTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>{t("dayMaster")}</span>
                <span className="font-bold">{displayChart.bodyStrength}/10</span>
              </div>
              <Progress value={(displayChart.bodyStrength as number) * 10} className="h-3" />
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-500">{displayChart?.bodyStrengthLevel}</Badge>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-body-strength-desc">
                {displayCulturalInterpretation?.bodyStrengthDesc || displayChart?.bodyStrengthDesc}
              </p>
              {culturalMutation.isPending && <Skeleton className="h-4 w-full mt-2" />}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t("destinyPattern")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-purple-500 to-cyan-500 text-lg px-4 py-1" data-testid="text-destiny-pattern">
                  {displayChart?.destinyPattern}
                </Badge>
              </div>
              <p className="text-muted-foreground" data-testid="text-destiny-desc">
                {displayCulturalInterpretation?.destinyPatternDesc || displayChart?.destinyPatternDesc}
              </p>
              {culturalMutation.isPending && <Skeleton className="h-4 w-full mt-2" />}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-400" />
              {t("grandLuck")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {displayChart.grandLuck?.map((period, index) => {
                const isSelected = selectedGrandLuck === index;
                const isCurrent = currentYear >= period.startYear && currentYear <= period.endYear;
                return (
                  <Button
                    key={index}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedGrandLuck(index);
                      handleYearChange(period.startYear);
                      // Load saved interpretation if exists - check culture-specific key first, then fall back to base
                      const baseKey = `${period.startAge}-${period.endAge}`;
                      const cultureKey = selectedCulture && selectedCulture !== "none" ? `${baseKey}_${selectedCulture}` : baseKey;
                      const interpretation = unlockedGrandLuck[cultureKey] || unlockedGrandLuck[baseKey];
                      if (interpretation) {
                        setGrandLuckInterpretation(getInterpretationForLang(interpretation, language));
                      } else {
                        setGrandLuckInterpretation("");
                      }
                    }}
                    className={isCurrent ? "ring-2 ring-green-500" : ""}
                    data-testid={`button-grand-luck-${index}`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-bold">{period.stem}{period.branch}</span>
                      <span className="text-xs opacity-70">{period.startAge}-{period.endAge} {t("age")}</span>
                    </div>
                    {isCurrent && <Badge variant="secondary" className="ml-1 text-xs">{t("current")}</Badge>}
                  </Button>
                );
              })}
            </div>

            <Card className="border-purple-500/30 bg-purple-500/5 overflow-hidden">
              <CardContent className="p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{t("grandLuckReading")}</h4>
                  {selectedGrandLuck !== null && displayChart.grandLuck?.[selectedGrandLuck] && (() => {
                    const period = displayChart.grandLuck![selectedGrandLuck];
                    const baseKey = `${period.startAge}-${period.endAge}`;
                    const cultureKey = selectedCulture && selectedCulture !== "none" ? `${baseKey}_${selectedCulture}` : baseKey;
                    const isUnlockedForCulture = !!unlockedGrandLuck[cultureKey];
                    const isUnlockedBase = !!unlockedGrandLuck[baseKey];
                    const hasCultureSelected = selectedCulture && selectedCulture !== "none";
                    
                    // If unlocked for this specific culture, show unlocked badge
                    if (isUnlockedForCulture) {
                      return (
                        <Badge variant="secondary" className="text-green-600" data-testid="badge-grand-luck-unlocked">
                          {t("unlocked")}
                        </Badge>
                      );
                    }
                    
                    // If culture is selected but not unlocked for this culture, show re-interpret button
                    const buttonLabel = hasCultureSelected && isUnlockedBase 
                      ? t("reinterpret") 
                      : t("deepReading");
                    
                    return isFreeTier ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="outline" disabled className="opacity-60" data-testid="button-deep-reading-grand-luck-locked">
                            <Lock className="h-3 w-3 mr-1" />
                            {t("deepReadingLocked")}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t("upgradeToUnlock")}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pendingReadingType === "grandLuck"}
                        onClick={() => {
                          deepReadingMutation.mutate({
                            type: "grandLuck",
                            data: period,
                            culture: selectedCulture,
                          });
                        }}
                        data-testid="button-deep-reading-grand-luck"
                      >
                        {pendingReadingType === "grandLuck" ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Zap className="h-3 w-3 mr-1" />
                        )}
                        {buttonLabel} (20 {t("stardust")})
                      </Button>
                    );
                  })()}
                </div>
                {(() => {
                  // Determine what interpretation to display - use period data, not index
                  const selectedPeriod = selectedGrandLuck !== null ? displayChart.grandLuck?.[selectedGrandLuck] : null;
                  const baseKey = selectedPeriod ? `${selectedPeriod.startAge}-${selectedPeriod.endAge}` : "";
                  const cultureKey = selectedCulture && selectedCulture !== "none" ? `${baseKey}_${selectedCulture}` : baseKey;
                  const hasCultureSelected = selectedCulture && selectedCulture !== "none";
                  const hasCultureSpecificUnlock = !!unlockedGrandLuck[cultureKey];
                  const hasBaseUnlock = !!unlockedGrandLuck[baseKey];
                  
                  // Use culture-specific interpretation if available, otherwise fall back to base
                  // Handle both string and multi-lang object formats for instant language switching
                  const savedInterpretation = unlockedGrandLuck[cultureKey] || 
                    (hasCultureSelected && !hasCultureSpecificUnlock && hasBaseUnlock ? unlockedGrandLuck[baseKey] : null);
                  const resolvedSavedInterpretation = savedInterpretation ? getInterpretationForLang(savedInterpretation, language) : "";
                  
                  const rawInterpretation = grandLuckInterpretation || 
                    resolvedSavedInterpretation ||
                    culturalInterpretation?.grandLuckDesc || 
                    (selectedGrandLuck === null ? t("selectGrandLuckPeriod") : t("clickDeepReading"));
                  const displayInterpretation = stripMarkdown(rawInterpretation);
                  
                  // Show notice if we're displaying base interpretation for a culture selection
                  const showCultureNotice = hasCultureSelected && !hasCultureSpecificUnlock && hasBaseUnlock && !grandLuckInterpretation;
                  
                  return (
                    <>
                      <ExpandableText
                        text={displayInterpretation}
                        maxHeight={80}
                        data-testid="text-grand-luck-interpretation"
                        expandLabel={t("viewAll")}
                        collapseLabel={t("collapse")}
                      />
                      {showCultureNotice && (
                        <p className="text-xs text-amber-500 mt-1">
                          {t("baseInterpretationShown")}
                        </p>
                      )}
                    </>
                  );
                })()}
                {pendingReadingType === "grandLuck" && <Skeleton className="h-4 w-full mt-2" />}
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-cyan-400" />
              {t("yearlyFortune")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-5 gap-2 md:grid-cols-10">
              {(() => {
                const selectedPeriod = selectedGrandLuck !== null ? displayChart.grandLuck?.[selectedGrandLuck] : null;
                const yearsToShow: { year: number; stem: string; branch: string; tenGod: string }[] = [];
                
                if (selectedPeriod) {
                  const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
                  const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
                  for (let y = selectedPeriod.startYear; y <= selectedPeriod.endYear; y++) {
                    const stemIdx = (y - 4) % 10;
                    const branchIdx = (y - 4) % 12;
                    yearsToShow.push({
                      year: y,
                      stem: stems[stemIdx >= 0 ? stemIdx : stemIdx + 10],
                      branch: branches[branchIdx >= 0 ? branchIdx : branchIdx + 12],
                      tenGod: displayChart.yearlyFortunes?.find(f => f.year === y)?.tenGod || "比肩"
                    });
                  }
                } else {
                  displayChart.yearlyFortunes?.forEach(f => yearsToShow.push(f));
                }
                
                return yearsToShow.map((fortune) => {
                  const isSelected = selectedYear === fortune.year;
                  const isCurrent = fortune.year === currentYear;
                  return (
                    <Button
                      key={fortune.year}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleYearChange(fortune.year)}
                      className={`flex flex-col p-2 ${isCurrent ? "ring-2 ring-green-500" : ""}`}
                      data-testid={`button-year-${fortune.year}`}
                    >
                      <span className="text-xs">{fortune.year}</span>
                      <span className="font-bold">{fortune.stem}{fortune.branch}</span>
                      {isCurrent && <span className="text-xs text-green-400">{t("thisYear")}</span>}
                    </Button>
                  );
                });
              })()}
            </div>

            {(() => {
              const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
              const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
              const stemIdx = (selectedYear - 4) % 10;
              const branchIdx = (selectedYear - 4) % 12;
              const stem = stems[stemIdx >= 0 ? stemIdx : stemIdx + 10];
              const branch = branches[branchIdx >= 0 ? branchIdx : branchIdx + 12];
              const existingFortune = displayChart.yearlyFortunes?.find(f => f.year === selectedYear);
              const tenGod = existingFortune?.tenGod || "比肩";
              const element = stemElements[stem];
              
              return (
                <Card className="border-cyan-500/30 bg-cyan-500/5 overflow-hidden">
                  <CardContent className="p-4 overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{selectedYear} {t("yearlyFortuneReading")}</h4>
                      {(() => {
                        const baseKey = String(selectedYear);
                        const cultureKey = selectedCulture && selectedCulture !== "none" ? `${baseKey}_${selectedCulture}` : baseKey;
                        const isUnlockedForCulture = !!unlockedYearlyFortunes[cultureKey];
                        const isUnlockedBase = !!unlockedYearlyFortunes[baseKey];
                        const hasCultureSelected = selectedCulture && selectedCulture !== "none";
                        
                        // If unlocked for this specific culture, show unlocked badge
                        if (isUnlockedForCulture) {
                          return (
                            <Badge variant="secondary" className="text-green-600" data-testid="badge-yearly-unlocked">
                              {t("unlocked")}
                            </Badge>
                          );
                        }
                        
                        // If culture is selected but not unlocked for this culture, show re-interpret button
                        const buttonLabel = hasCultureSelected && isUnlockedBase 
                          ? t("reinterpret") 
                          : t("deepReading");
                        
                        return isFreeTier ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline" disabled className="opacity-60" data-testid="button-deep-reading-yearly-locked">
                                <Lock className="h-3 w-3 mr-1" />
                                {t("deepReadingLocked")}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("upgradeToUnlock")}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pendingReadingType === "yearlyFortune"}
                            onClick={() => {
                              deepReadingMutation.mutate({
                                type: "yearlyFortune",
                                data: {
                                  year: selectedYear,
                                  stem,
                                  branch,
                                  tenGod,
                                  age: selectedYear - (displayChart.birthYear || 1990),
                                },
                                culture: selectedCulture,
                              });
                            }}
                            data-testid="button-deep-reading-yearly"
                          >
                            {pendingReadingType === "yearlyFortune" ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Zap className="h-3 w-3 mr-1" />
                            )}
                            {buttonLabel} (20 {t("stardust")})
                          </Button>
                        );
                      })()}
                    </div>
                    {(() => {
                      // Determine what interpretation to display
                      const baseKey = String(selectedYear);
                      const cultureKey = selectedCulture && selectedCulture !== "none" ? `${baseKey}_${selectedCulture}` : baseKey;
                      const hasCultureSelected = selectedCulture && selectedCulture !== "none";
                      const hasCultureSpecificUnlock = !!unlockedYearlyFortunes[cultureKey];
                      const hasBaseUnlock = !!unlockedYearlyFortunes[baseKey];
                      
                      // Use culture-specific interpretation if available, otherwise fall back to base
                      // Handle both string and multi-lang object formats for instant language switching
                      const savedInterpretation = unlockedYearlyFortunes[cultureKey] || 
                        (hasCultureSelected && !hasCultureSpecificUnlock && hasBaseUnlock ? unlockedYearlyFortunes[baseKey] : null);
                      const resolvedSavedInterpretation = savedInterpretation ? getInterpretationForLang(savedInterpretation, language) : "";
                      
                      const rawInterpretation = yearlyInterpretation || 
                        resolvedSavedInterpretation ||
                        culturalInterpretation?.yearlyFortuneDesc || 
                        t("clickDeepReading");
                      const displayInterpretation = stripMarkdown(rawInterpretation);
                      
                      // Show notice if we're displaying base interpretation for a culture selection
                      const showCultureNotice = hasCultureSelected && !hasCultureSpecificUnlock && hasBaseUnlock && !yearlyInterpretation;
                      
                      return (
                        <>
                          <ExpandableText
                            text={displayInterpretation}
                            maxHeight={80}
                            data-testid="text-yearly-fortune-interpretation"
                            expandLabel={t("viewAll")}
                            collapseLabel={t("collapse")}
                          />
                          {showCultureNotice && (
                            <p className="text-xs text-amber-500 mt-1">
                              {t("baseInterpretationShown")}
                            </p>
                          )}
                        </>
                      );
                    })()}
                    {pendingReadingType === "yearlyFortune" && <Skeleton className="h-4 w-full mt-2" />}
                  </CardContent>
                </Card>
              );
            })()}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showGeneratingDialog} onOpenChange={setShowGeneratingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("generating")}
            </DialogTitle>
            <DialogDescription>
              {pendingReadingType === "grandLuck" ? t("grandLuckGenerating") : t("yearlyFortuneGenerating")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
              <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-purple-400" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
