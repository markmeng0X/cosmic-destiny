import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

interface MaskedContentProps {
  children: React.ReactNode;
  isLocked: boolean;
  onUnlock: () => void;
  isUnlocking?: boolean;
  cost?: number;
}

export function MaskedContent({
  children,
  isLocked,
  onUnlock,
  isUnlocking = false,
  cost = 20,
}: MaskedContentProps) {
  const { t } = useI18n();

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="select-none blur-sm opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/60 backdrop-blur-sm rounded-lg">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">{t("contentLocked")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("unlockCost")} {cost} {t("stardust")}
          </p>
        </div>
        <Button
          onClick={onUnlock}
          disabled={isUnlocking}
          className="gap-2"
          data-testid="button-unlock-content"
        >
          {isUnlocking ? (
            <>
              <Sparkles className="h-4 w-4 animate-pulse" />
              {t("unlocking")}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {t("unlockNow")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
