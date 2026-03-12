import { createContext, useContext, useEffect, useState } from "react";

type TimezoneContextType = {
  timezone: string;
  setTimezone: (tz: string) => void;
  utcOffset: number;
};

const TimezoneContext = createContext<TimezoneContextType>({
  timezone: "UTC+8",
  setTimezone: () => {},
  utcOffset: 8,
});

// Timezone options with translation keys for city names
export const timezoneOptions = [
  { value: "UTC-12", offset: -12, labelKey: "tzUTCm12" },
  { value: "UTC-11", offset: -11, labelKey: "tzUTCm11" },
  { value: "UTC-10", offset: -10, labelKey: "tzHawaii" },
  { value: "UTC-9", offset: -9, labelKey: "tzAlaska" },
  { value: "UTC-8", offset: -8, labelKey: "tzPacific" },
  { value: "UTC-7", offset: -7, labelKey: "tzMountain" },
  { value: "UTC-6", offset: -6, labelKey: "tzCentral" },
  { value: "UTC-5", offset: -5, labelKey: "tzEastern" },
  { value: "UTC-4", offset: -4, labelKey: "tzUTCm4" },
  { value: "UTC-3", offset: -3, labelKey: "tzBrazil" },
  { value: "UTC-2", offset: -2, labelKey: "tzUTCm2" },
  { value: "UTC-1", offset: -1, labelKey: "tzUTCm1" },
  { value: "UTC+0", offset: 0, labelKey: "tzLondon" },
  { value: "UTC+1", offset: 1, labelKey: "tzParis" },
  { value: "UTC+2", offset: 2, labelKey: "tzUTCp2" },
  { value: "UTC+3", offset: 3, labelKey: "tzMoscow" },
  { value: "UTC+4", offset: 4, labelKey: "tzDubai" },
  { value: "UTC+5", offset: 5, labelKey: "tzUTCp5" },
  { value: "UTC+5.5", offset: 5.5, labelKey: "tzIndia" },
  { value: "UTC+6", offset: 6, labelKey: "tzUTCp6" },
  { value: "UTC+7", offset: 7, labelKey: "tzBangkok" },
  { value: "UTC+8", offset: 8, labelKey: "tzBeijing" },
  { value: "UTC+9", offset: 9, labelKey: "tzTokyo" },
  { value: "UTC+10", offset: 10, labelKey: "tzSydney" },
  { value: "UTC+11", offset: 11, labelKey: "tzUTCp11" },
  { value: "UTC+12", offset: 12, labelKey: "tzNewZealand" },
] as const;

function detectTimezoneFromBrowser(): string {
  const offsetMinutes = new Date().getTimezoneOffset();
  const offsetHours = -offsetMinutes / 60;
  
  const availableOffsets = timezoneOptions.map(o => o.offset);
  
  let closestOffset = availableOffsets[0];
  let minDiff = Math.abs(offsetHours - closestOffset);
  
  for (const offset of availableOffsets) {
    const diff = Math.abs(offsetHours - offset);
    if (diff < minDiff) {
      minDiff = diff;
      closestOffset = offset;
    }
  }
  
  const matched = timezoneOptions.find(o => o.offset === closestOffset);
  return matched?.value || "UTC+8";
}

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [timezone, setTimezoneState] = useState<string>(() => {
    const saved = localStorage.getItem("cosmic-timezone");
    return saved || detectTimezoneFromBrowser();
  });

  useEffect(() => {
    const saved = localStorage.getItem("cosmic-timezone");
    if (!saved) {
      const detected = detectTimezoneFromBrowser();
      setTimezoneState(detected);
      localStorage.setItem("cosmic-timezone", detected);
    }
  }, []);

  const setTimezone = (tz: string) => {
    localStorage.setItem("cosmic-timezone", tz);
    setTimezoneState(tz);
  };

  const currentOption = timezoneOptions.find(o => o.value === timezone);
  const utcOffset = currentOption?.offset ?? 8;

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, utcOffset }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export const useTimezone = () => {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error("useTimezone must be used within a TimezoneProvider");
  }
  return context;
};
