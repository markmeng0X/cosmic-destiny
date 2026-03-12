import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTimezone, timezoneOptions } from "./timezone-provider";
import { useI18n } from "@/lib/i18n";

export function TimezoneSelector() {
  const { timezone, setTimezone } = useTimezone();
  const { t } = useI18n();

  return (
    <Select value={timezone} onValueChange={setTimezone}>
      <SelectTrigger className="w-auto gap-2" data-testid="select-timezone">
        <Globe className="h-4 w-4" />
        <SelectValue placeholder={t("timezone")} />
      </SelectTrigger>
      <SelectContent>
        {timezoneOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {t(option.labelKey as any)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TimezoneField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const { t } = useI18n();
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Globe className="h-4 w-4" />
        {label || t("timezone")}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid="select-birth-timezone">
          <SelectValue placeholder={t("timezone")} />
        </SelectTrigger>
        <SelectContent>
          {timezoneOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.labelKey as any)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
