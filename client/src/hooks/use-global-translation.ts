import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface TranslatableContent {
  fortune: any | null;
  baziChart: any | null;
  culturalInterpretation: any | null;
  grandLuckInterpretation: string | null;
  yearlyInterpretation: string | null;
  matching: any | null;
  divination: any | null;
}

interface ContentLangTracking {
  fortune: string;
  baziChart: string;
  culturalInterpretation: string;
  grandLuckInterpretation: string;
  yearlyInterpretation: string;
  matching: string;
  divination: string;
}

interface TranslationStore {
  originalContent: TranslatableContent;
  translatedContent: TranslatableContent;
  generatedLangs: ContentLangTracking;
  lastTranslatedLangs: ContentLangTracking;
  isTranslating: boolean;
  listeners: Set<() => void>;
}

interface TranslationStoreExtended extends TranslationStore {
  currentTargetLang: string;
  pendingTranslation: boolean;
  translationContext: { t: (key: any) => string; toast: any; dismiss: any } | null;
}

const store: TranslationStoreExtended = {
  originalContent: {
    fortune: null,
    baziChart: null,
    culturalInterpretation: null,
    grandLuckInterpretation: null,
    yearlyInterpretation: null,
    matching: null,
    divination: null,
  },
  translatedContent: {
    fortune: null,
    baziChart: null,
    culturalInterpretation: null,
    grandLuckInterpretation: null,
    yearlyInterpretation: null,
    matching: null,
    divination: null,
  },
  generatedLangs: {
    fortune: "zh",
    baziChart: "zh",
    culturalInterpretation: "zh",
    grandLuckInterpretation: "zh",
    yearlyInterpretation: "zh",
    matching: "zh",
    divination: "zh",
  },
  lastTranslatedLangs: {
    fortune: "zh",
    baziChart: "zh",
    culturalInterpretation: "zh",
    grandLuckInterpretation: "zh",
    yearlyInterpretation: "zh",
    matching: "zh",
    divination: "zh",
  },
  isTranslating: false,
  listeners: new Set(),
  currentTargetLang: "zh",
  pendingTranslation: false,
  translationContext: null,
};

function notifyListeners() {
  store.listeners.forEach(fn => fn());
}

function checkAndTriggerTranslation() {
  if (!store.translationContext || store.isTranslating) return;
  
  const needsTranslation = 
    (store.originalContent.fortune && store.lastTranslatedLangs.fortune !== store.currentTargetLang) ||
    (store.originalContent.baziChart && store.lastTranslatedLangs.baziChart !== store.currentTargetLang) ||
    (store.originalContent.culturalInterpretation && store.lastTranslatedLangs.culturalInterpretation !== store.currentTargetLang) ||
    (store.originalContent.grandLuckInterpretation && store.lastTranslatedLangs.grandLuckInterpretation !== store.currentTargetLang) ||
    (store.originalContent.yearlyInterpretation && store.lastTranslatedLangs.yearlyInterpretation !== store.currentTargetLang) ||
    (store.originalContent.matching && store.lastTranslatedLangs.matching !== store.currentTargetLang) ||
    (store.originalContent.divination && store.lastTranslatedLangs.divination !== store.currentTargetLang);
  
  if (needsTranslation) {
    const { t, toast, dismiss } = store.translationContext;
    translateAllContent(store.currentTargetLang, t, toast, dismiss);
  }
}

function contentEquals(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function setOriginalFortune(fortune: any, lang: string) {
  const isSameContent = contentEquals(store.originalContent.fortune, fortune);
  if (isSameContent && store.lastTranslatedLangs.fortune === store.currentTargetLang) {
    return;
  }
  
  store.originalContent.fortune = fortune;
  if (!isSameContent) {
    store.translatedContent.fortune = fortune;
    store.generatedLangs.fortune = lang;
    store.lastTranslatedLangs.fortune = lang;
  }
  notifyListeners();
  checkAndTriggerTranslation();
}

export function setOriginalBaziContent(content: {
  baziChart?: any;
  culturalInterpretation?: any;
  grandLuckInterpretation?: string;
  yearlyInterpretation?: string;
}, lang: string) {
  let hasChanges = false;
  let needsCheck = false;
  
  if (content.baziChart !== undefined) {
    const isSame = contentEquals(store.originalContent.baziChart, content.baziChart);
    if (!isSame || store.lastTranslatedLangs.baziChart !== store.currentTargetLang) {
      store.originalContent.baziChart = content.baziChart;
      if (!isSame) {
        store.translatedContent.baziChart = content.baziChart;
        store.generatedLangs.baziChart = lang;
        store.lastTranslatedLangs.baziChart = lang;
      }
      hasChanges = true;
      needsCheck = true;
    }
  }
  if (content.culturalInterpretation !== undefined) {
    const isSame = contentEquals(store.originalContent.culturalInterpretation, content.culturalInterpretation);
    if (!isSame || store.lastTranslatedLangs.culturalInterpretation !== store.currentTargetLang) {
      store.originalContent.culturalInterpretation = content.culturalInterpretation;
      if (!isSame) {
        store.translatedContent.culturalInterpretation = content.culturalInterpretation;
        store.generatedLangs.culturalInterpretation = lang;
        store.lastTranslatedLangs.culturalInterpretation = lang;
      }
      hasChanges = true;
      needsCheck = true;
    }
  }
  if (content.grandLuckInterpretation !== undefined) {
    const isSame = contentEquals(store.originalContent.grandLuckInterpretation, content.grandLuckInterpretation);
    if (!isSame || store.lastTranslatedLangs.grandLuckInterpretation !== store.currentTargetLang) {
      store.originalContent.grandLuckInterpretation = content.grandLuckInterpretation;
      if (!isSame) {
        store.translatedContent.grandLuckInterpretation = content.grandLuckInterpretation;
        store.generatedLangs.grandLuckInterpretation = lang;
        store.lastTranslatedLangs.grandLuckInterpretation = lang;
      }
      hasChanges = true;
      needsCheck = true;
    }
  }
  if (content.yearlyInterpretation !== undefined) {
    const isSame = contentEquals(store.originalContent.yearlyInterpretation, content.yearlyInterpretation);
    if (!isSame || store.lastTranslatedLangs.yearlyInterpretation !== store.currentTargetLang) {
      store.originalContent.yearlyInterpretation = content.yearlyInterpretation;
      if (!isSame) {
        store.translatedContent.yearlyInterpretation = content.yearlyInterpretation;
        store.generatedLangs.yearlyInterpretation = lang;
        store.lastTranslatedLangs.yearlyInterpretation = lang;
      }
      hasChanges = true;
      needsCheck = true;
    }
  }
  
  if (hasChanges) {
    notifyListeners();
  }
  if (needsCheck) {
    checkAndTriggerTranslation();
  }
}

export function setOriginalMatching(matching: any, lang: string) {
  const isSameContent = contentEquals(store.originalContent.matching, matching);
  if (isSameContent && store.lastTranslatedLangs.matching === store.currentTargetLang) {
    return;
  }
  
  store.originalContent.matching = matching;
  if (!isSameContent) {
    store.translatedContent.matching = matching;
    store.generatedLangs.matching = lang;
    store.lastTranslatedLangs.matching = lang;
  }
  notifyListeners();
  checkAndTriggerTranslation();
}

export function setOriginalDivination(divination: any, lang: string) {
  const isSameContent = contentEquals(store.originalContent.divination, divination);
  if (isSameContent && store.lastTranslatedLangs.divination === store.currentTargetLang) {
    return;
  }
  
  store.originalContent.divination = divination;
  if (!isSameContent) {
    store.translatedContent.divination = divination;
    store.generatedLangs.divination = lang;
    store.lastTranslatedLangs.divination = lang;
  }
  notifyListeners();
  checkAndTriggerTranslation();
}

async function translateAllContent(targetLang: string, t: (key: any) => string, toast: any, dismiss: any) {
  if (store.isTranslating) return;
  
  const needsTranslation = {
    fortune: store.originalContent.fortune && store.lastTranslatedLangs.fortune !== targetLang,
    baziChart: store.originalContent.baziChart && store.lastTranslatedLangs.baziChart !== targetLang,
    culturalInterpretation: store.originalContent.culturalInterpretation && store.lastTranslatedLangs.culturalInterpretation !== targetLang,
    grandLuckInterpretation: store.originalContent.grandLuckInterpretation && store.lastTranslatedLangs.grandLuckInterpretation !== targetLang,
    yearlyInterpretation: store.originalContent.yearlyInterpretation && store.lastTranslatedLangs.yearlyInterpretation !== targetLang,
    matching: store.originalContent.matching && store.lastTranslatedLangs.matching !== targetLang,
    divination: store.originalContent.divination && store.lastTranslatedLangs.divination !== targetLang,
  };
  
  const hasAnyToTranslate = Object.values(needsTranslation).some(Boolean);
  if (!hasAnyToTranslate) return;
  
  store.isTranslating = true;
  notifyListeners();
  
  const toastResult = toast({
    title: t("translating"),
    description: t("translatingDesc"),
    duration: 120000,
  });
  const toastId = toastResult.id;
  
  try {
    const promises: Promise<void>[] = [];
    
    if (needsTranslation.fortune) {
      promises.push(translateFortuneAtomic(store.originalContent.fortune, targetLang));
    }
    
    if (needsTranslation.baziChart) {
      promises.push(translateBaziChartAtomic(store.originalContent.baziChart, targetLang));
    }
    
    if (needsTranslation.culturalInterpretation) {
      promises.push(translateCulturalInterpretationAtomic(store.originalContent.culturalInterpretation, targetLang));
    }
    
    if (needsTranslation.grandLuckInterpretation && store.originalContent.grandLuckInterpretation) {
      promises.push(translateBaziInterpretationAtomic("grandLuckInterpretation", store.originalContent.grandLuckInterpretation, targetLang));
    }
    
    if (needsTranslation.yearlyInterpretation && store.originalContent.yearlyInterpretation) {
      promises.push(translateBaziInterpretationAtomic("yearlyInterpretation", store.originalContent.yearlyInterpretation, targetLang));
    }
    
    if (needsTranslation.matching) {
      promises.push(translateMatchingAtomic(store.originalContent.matching, targetLang));
    }
    
    if (needsTranslation.divination) {
      promises.push(translateDivinationAtomic(store.originalContent.divination, targetLang));
    }
    
    await Promise.all(promises);
    
    dismiss(toastId);
    toast({
      title: t("translationComplete"),
      description: t("translationCompleteDesc"),
      duration: 2000,
    });
  } catch (error) {
    console.error("Translation error:", error);
    dismiss(toastId);
  } finally {
    store.isTranslating = false;
    notifyListeners();
  }
}

async function translateFortuneAtomic(fortune: any, targetLang: string) {
  try {
    const content = {
      aiInterpretation: fortune.aiInterpretation || undefined,
      careerDesc: fortune.careerDesc || undefined,
      loveDesc: fortune.loveDesc || undefined,
      wealthDesc: fortune.wealthDesc || undefined,
      healthDesc: fortune.healthDesc || undefined,
      studyDesc: fortune.studyDesc || undefined,
      insights: fortune.insights?.map((i: any) => i.text) || undefined,
      recommendations: fortune.recommendations as string[] | undefined,
      hourlyFortunes: Array.isArray(fortune.hourlyFortunes) 
        ? fortune.hourlyFortunes.map((hf: any) => ({ favorable: hf.favorable, unfavorable: hf.unfavorable }))
        : undefined,
    };
    
    const res = await apiRequest("POST", "/api/translate/fortune", { content, targetLanguage: targetLang });
    if (res.ok) {
      const translated = await res.json();
      store.translatedContent.fortune = {
        ...fortune,
        aiInterpretation: translated.aiInterpretation || fortune.aiInterpretation,
        careerDesc: translated.careerDesc || fortune.careerDesc,
        loveDesc: translated.loveDesc || fortune.loveDesc,
        wealthDesc: translated.wealthDesc || fortune.wealthDesc,
        healthDesc: translated.healthDesc || fortune.healthDesc,
        studyDesc: translated.studyDesc || fortune.studyDesc,
        insights: translated.insights?.map((text: string, i: number) => ({ 
          text, 
          type: fortune.insights?.[i]?.type || "advice" 
        })) || fortune.insights,
        recommendations: translated.recommendations || fortune.recommendations,
        hourlyFortunes: translated.hourlyFortunes?.map((hf: { favorable: string; unfavorable: string }, i: number) => ({
          ...(Array.isArray(fortune.hourlyFortunes) ? fortune.hourlyFortunes[i] : {}),
          favorable: hf.favorable,
          unfavorable: hf.unfavorable,
        })) || fortune.hourlyFortunes,
      };
      store.lastTranslatedLangs.fortune = targetLang;
    }
  } catch (error) {
    console.error("Fortune translation error:", error);
  }
}

async function translateBaziChartAtomic(baziChart: any, targetLang: string) {
  try {
    const fieldsToTranslate = [
      { key: "dayMasterElementDesc", value: baziChart.dayMasterElementDesc },
      { key: "favorableGodDesc", value: baziChart.favorableGodDesc },
      { key: "bodyStrengthDesc", value: baziChart.bodyStrengthDesc },
      { key: "destinyPatternDesc", value: baziChart.destinyPatternDesc },
    ].filter(f => f.value);
    
    const translatedChart = { ...baziChart };
    
    for (const field of fieldsToTranslate) {
      const res = await apiRequest("POST", "/api/translate/divination", { 
        response: field.value, 
        targetLanguage: targetLang 
      });
      if (res.ok) {
        const data = await res.json();
        translatedChart[field.key] = data.response;
      }
    }
    
    const labelsRes = await apiRequest("POST", "/api/translate/texts", {
      texts: [
        baziChart.dayMasterPolarity,
        baziChart.dayMasterElement,
        baziChart.favorableGod,
        baziChart.avoidGod,
        baziChart.bodyStrengthLevel,
        baziChart.destinyPattern,
      ].filter(Boolean),
      targetLanguage: targetLang,
    });
    
    if (labelsRes.ok) {
      const labelsData = await labelsRes.json();
      const translations = labelsData.translations || [];
      let idx = 0;
      if (baziChart.dayMasterPolarity) translatedChart.dayMasterPolarity = translations[idx++] || baziChart.dayMasterPolarity;
      if (baziChart.dayMasterElement) translatedChart.dayMasterElement = translations[idx++] || baziChart.dayMasterElement;
      if (baziChart.favorableGod) translatedChart.favorableGod = translations[idx++] || baziChart.favorableGod;
      if (baziChart.avoidGod) translatedChart.avoidGod = translations[idx++] || baziChart.avoidGod;
      if (baziChart.bodyStrengthLevel) translatedChart.bodyStrengthLevel = translations[idx++] || baziChart.bodyStrengthLevel;
      if (baziChart.destinyPattern) translatedChart.destinyPattern = translations[idx++] || baziChart.destinyPattern;
    }
    
    store.translatedContent.baziChart = translatedChart;
    store.lastTranslatedLangs.baziChart = targetLang;
  } catch (error) {
    console.error("BaZi chart translation error:", error);
  }
}

async function translateCulturalInterpretationAtomic(culturalInterpretation: any, targetLang: string) {
  try {
    const translatedCultural = { ...culturalInterpretation };
    
    const fieldsToTranslate = [
      "dayMasterDesc",
      "favorableGodDesc",
      "avoidGodDesc",
      "bodyStrengthDesc",
      "destinyPatternDesc",
      "grandLuckDesc",
      "yearlyFortuneDesc",
    ];
    
    for (const field of fieldsToTranslate) {
      if (culturalInterpretation[field]) {
        try {
          const res = await apiRequest("POST", "/api/translate/divination", { 
            response: culturalInterpretation[field], 
            targetLanguage: targetLang 
          });
          if (res.ok) {
            const data = await res.json();
            translatedCultural[field] = data.response;
          }
        } catch (fieldError) {
          console.error(`Failed to translate ${field}:`, fieldError);
        }
      }
    }
    
    store.translatedContent.culturalInterpretation = translatedCultural;
    store.lastTranslatedLangs.culturalInterpretation = targetLang;
  } catch (error) {
    console.error("Cultural interpretation translation error:", error);
  }
}

async function translateBaziInterpretationAtomic(key: "grandLuckInterpretation" | "yearlyInterpretation", text: string, targetLang: string) {
  try {
    const res = await apiRequest("POST", "/api/translate/divination", { 
      response: text, 
      targetLanguage: targetLang 
    });
    if (res.ok) {
      const data = await res.json();
      store.translatedContent[key] = data.response;
      store.lastTranslatedLangs[key] = targetLang;
    }
  } catch (error) {
    console.error(`${key} translation error:`, error);
  }
}

async function translateMatchingAtomic(matching: any, targetLang: string) {
  try {
    const translatedMatching = { ...matching };
    
    if (matching.matchConclusion) {
      const res = await apiRequest("POST", "/api/translate/divination", { 
        response: matching.matchConclusion, 
        targetLanguage: targetLang 
      });
      if (res.ok) {
        const data = await res.json();
        translatedMatching.matchConclusion = data.response;
      }
    }
    
    if (matching.culturalInterpretation) {
      const res = await apiRequest("POST", "/api/translate/divination", { 
        response: matching.culturalInterpretation, 
        targetLanguage: targetLang 
      });
      if (res.ok) {
        const data = await res.json();
        translatedMatching.culturalInterpretation = data.response;
      }
    }
    
    if (matching.dimensionAnalysis) {
      const translatedDimensions: Record<string, { score: number; desc: string }> = {};
      for (const [dimKey, value] of Object.entries(matching.dimensionAnalysis as Record<string, { score: number; desc: string }>)) {
        const res = await apiRequest("POST", "/api/translate/divination", { 
          response: value.desc, 
          targetLanguage: targetLang 
        });
        if (res.ok) {
          const data = await res.json();
          translatedDimensions[dimKey] = { score: value.score, desc: data.response };
        } else {
          translatedDimensions[dimKey] = value;
        }
      }
      translatedMatching.dimensionAnalysis = translatedDimensions;
    }
    
    store.translatedContent.matching = translatedMatching;
    store.lastTranslatedLangs.matching = targetLang;
  } catch (error) {
    console.error("Matching translation error:", error);
  }
}

async function translateDivinationAtomic(divination: any, targetLang: string) {
  try {
    const translatedDivination = { ...divination };
    
    if (divination.result) {
      const res = await apiRequest("POST", "/api/translate/divination", { 
        response: divination.result, 
        targetLanguage: targetLang 
      });
      if (res.ok) {
        const data = await res.json();
        translatedDivination.result = data.response;
      }
    }
    
    if (divination.advice) {
      const res = await apiRequest("POST", "/api/translate/divination", { 
        response: divination.advice, 
        targetLanguage: targetLang 
      });
      if (res.ok) {
        const data = await res.json();
        translatedDivination.advice = data.response;
      }
    }
    
    if (divination.keyPoints && Array.isArray(divination.keyPoints)) {
      const translatedKeyPoints: string[] = [];
      for (const keyPoint of divination.keyPoints) {
        const res = await apiRequest("POST", "/api/translate/divination", { 
          response: keyPoint, 
          targetLanguage: targetLang 
        });
        if (res.ok) {
          const data = await res.json();
          translatedKeyPoints.push(data.response);
        } else {
          translatedKeyPoints.push(keyPoint);
        }
      }
      translatedDivination.keyPoints = translatedKeyPoints;
    }
    
    store.translatedContent.divination = translatedDivination;
    store.lastTranslatedLangs.divination = targetLang;
  } catch (error) {
    console.error("Divination translation error:", error);
  }
}

export function useGlobalTranslation() {
  const { t, language } = useI18n();
  const { toast, dismiss } = useToast();
  const lastLangRef = useRef(language);
  const [, setUpdateCounter] = useState(0);
  
  useEffect(() => {
    const listener = () => setUpdateCounter(c => c + 1);
    store.listeners.add(listener);
    return () => { store.listeners.delete(listener); };
  }, []);
  
  useEffect(() => {
    store.translationContext = { t, toast, dismiss };
    store.currentTargetLang = language;
  }, [t, toast, dismiss, language]);
  
  useEffect(() => {
    if (language !== lastLangRef.current) {
      lastLangRef.current = language;
      translateAllContent(language, t, toast, dismiss);
    }
  }, [language, t, toast, dismiss]);
  
  return {
    isTranslating: store.isTranslating,
    translatedFortune: store.translatedContent.fortune,
    translatedBaziChart: store.translatedContent.baziChart,
    translatedCulturalInterpretation: store.translatedContent.culturalInterpretation,
    translatedGrandLuckInterpretation: store.translatedContent.grandLuckInterpretation,
    translatedYearlyInterpretation: store.translatedContent.yearlyInterpretation,
    translatedMatching: store.translatedContent.matching,
    translatedDivination: store.translatedContent.divination,
  };
}

export function useTranslationSubscription() {
  const [, setUpdateCounter] = useState(0);
  
  useEffect(() => {
    const listener = () => setUpdateCounter(c => c + 1);
    store.listeners.add(listener);
    return () => { store.listeners.delete(listener); };
  }, []);
  
  return {
    isTranslating: store.isTranslating,
    translatedFortune: store.translatedContent.fortune,
    translatedBaziChart: store.translatedContent.baziChart,
    translatedCulturalInterpretation: store.translatedContent.culturalInterpretation,
    translatedGrandLuckInterpretation: store.translatedContent.grandLuckInterpretation,
    translatedYearlyInterpretation: store.translatedContent.yearlyInterpretation,
    translatedMatching: store.translatedContent.matching,
    translatedDivination: store.translatedContent.divination,
  };
}
