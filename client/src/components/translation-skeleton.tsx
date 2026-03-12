import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function TranslationOverlay() {
  const { t } = useI18n();
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md" data-testid="translation-overlay">
      <div className="flex flex-col items-center gap-3 rounded-lg bg-card/95 p-8 shadow-xl border border-border">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        <span className="text-base font-medium text-foreground">{t("translating")}</span>
        <span className="text-sm text-muted-foreground">{t("translatingDesc")}</span>
      </div>
    </div>
  );
}

export function FortuneCardSkeleton() {
  return (
    <Card className="relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-900/40 via-purple-800/30 to-indigo-900/20">
      <CardContent className="p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BaziCardSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}

export function MatchingCardSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-center">
          <Skeleton className="h-28 w-28 rounded-full" />
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
