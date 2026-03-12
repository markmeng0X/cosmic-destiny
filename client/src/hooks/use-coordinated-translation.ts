import { useState, useRef, useCallback, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TranslationState {
  isTranslating: boolean;
  pendingCount: number;
}

// Global state for coordinated translation
let globalState: TranslationState = { isTranslating: false, pendingCount: 0 };
const listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

function incrementPending() {
  globalState = { ...globalState, pendingCount: globalState.pendingCount + 1, isTranslating: true };
  notifyListeners();
}

function decrementPending() {
  const newCount = Math.max(0, globalState.pendingCount - 1);
  globalState = { ...globalState, pendingCount: newCount, isTranslating: newCount > 0 };
  notifyListeners();
}

export function useCoordinatedTranslation() {
  const { t, language } = useI18n();
  const { toast, dismiss } = useToast();
  const [state, setState] = useState(globalState);
  const toastIdRef = useRef<string | null>(null);
  const lastToastLangRef = useRef<string>(language);

  // Subscribe to global state changes
  useEffect(() => {
    const listener = () => setState({ ...globalState });
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  // Show/hide toast based on translation state
  useEffect(() => {
    if (state.isTranslating && !toastIdRef.current) {
      const { id } = toast({
        title: t("translating"),
        description: t("translatingDesc"),
        duration: 120000, // Long duration, dismiss manually
      });
      toastIdRef.current = id;
      lastToastLangRef.current = language;
    } else if (!state.isTranslating && toastIdRef.current) {
      // Dismiss current toast and show completion toast
      dismiss(toastIdRef.current);
      toastIdRef.current = null;
      
      // Show completion toast
      toast({
        title: t("translationComplete"),
        description: t("translationCompleteDesc"),
        duration: 2000, // Auto-dismiss after 2 seconds
      });
    }
  }, [state.isTranslating, t, toast, dismiss, language]);

  // Start a translation task
  const startTranslation = useCallback(() => {
    incrementPending();
  }, []);

  // End a translation task
  const endTranslation = useCallback(() => {
    decrementPending();
  }, []);

  return {
    isTranslating: state.isTranslating,
    startTranslation,
    endTranslation,
    language,
  };
}

// Translate BaZi chart labels (element, favorable gods, body strength, destiny pattern)
export async function translateBaziLabels(
  labels: {
    dayMasterPolarity?: string;
    dayMasterElement?: string;
    favorableGod?: string;
    avoidGod?: string;
    bodyStrengthLevel?: string;
    destinyPattern?: string;
  },
  targetLanguage: string
): Promise<{
  dayMasterPolarity?: string;
  dayMasterElement?: string;
  favorableGod?: string;
  avoidGod?: string;
  bodyStrengthLevel?: string;
  destinyPattern?: string;
}> {
  // Skip if target is Chinese (original language)
  if (targetLanguage === "zh") {
    return labels;
  }

  const textsToTranslate: string[] = [];
  const keys: string[] = [];

  if (labels.dayMasterPolarity) {
    textsToTranslate.push(labels.dayMasterPolarity);
    keys.push("dayMasterPolarity");
  }
  if (labels.dayMasterElement) {
    textsToTranslate.push(labels.dayMasterElement);
    keys.push("dayMasterElement");
  }
  if (labels.favorableGod) {
    textsToTranslate.push(labels.favorableGod);
    keys.push("favorableGod");
  }
  if (labels.avoidGod) {
    textsToTranslate.push(labels.avoidGod);
    keys.push("avoidGod");
  }
  if (labels.bodyStrengthLevel) {
    textsToTranslate.push(labels.bodyStrengthLevel);
    keys.push("bodyStrengthLevel");
  }
  if (labels.destinyPattern) {
    textsToTranslate.push(labels.destinyPattern);
    keys.push("destinyPattern");
  }

  if (textsToTranslate.length === 0) {
    return labels;
  }

  try {
    const res = await apiRequest("POST", "/api/translate/texts", {
      texts: textsToTranslate,
      targetLanguage,
    });
    if (res.ok) {
      const data = await res.json();
      const result: Record<string, string> = {};
      keys.forEach((key, i) => {
        result[key] = data.translations?.[i] || textsToTranslate[i];
      });
      return result as typeof labels;
    }
  } catch (error) {
    console.error("Failed to translate BaZi labels:", error);
  }

  return labels;
}
