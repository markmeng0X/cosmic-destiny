import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

export type BirthInfoFormData = {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  gender: string;
  nickname?: string;
  timezone?: string;
};

export const hourOptionsBase = [
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

export const genderOptions = [
  { value: "male", labelKey: "male" as const },
  { value: "female", labelKey: "female" as const },
];

export const createBirthInfoSchema = (t: (key: any) => string, options?: { 
  requireNickname?: boolean;
  requireBirthPlace?: boolean;
  requireGender?: boolean;
}) => {
  const { requireNickname = false, requireBirthPlace = true, requireGender = true } = options || {};
  
  return z.object({
    nickname: requireNickname 
      ? z.string().min(1, { message: t("nicknameRequired") })
      : z.string().optional(),
    birthDate: z.string().min(1, { message: t("birthDateRequired") }),
    birthTime: z.string().min(1, { message: t("birthTimeRequired") }),
    birthPlace: requireBirthPlace
      ? z.string().min(1, { message: t("birthPlaceRequired") })
      : z.string().optional(),
    gender: requireGender
      ? z.string().min(1, { message: t("genderRequired") })
      : z.string().optional(),
    timezone: z.string().optional(),
  });
};

interface UseBaziFormOptions {
  defaultValues?: Partial<BirthInfoFormData>;
  onSuccess?: () => void;
  requireNickname?: boolean;
  requireBirthPlace?: boolean;
  requireGender?: boolean;
  calculateBaziAfterSave?: boolean;
}

export function useBaziForm(options: UseBaziFormOptions = {}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const {
    defaultValues = {},
    onSuccess,
    requireNickname = false,
    requireBirthPlace = true,
    requireGender = true,
    calculateBaziAfterSave = true,
  } = options;

  const schema = createBirthInfoSchema(t, { requireNickname, requireBirthPlace, requireGender });

  const form = useForm<BirthInfoFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nickname: defaultValues.nickname || "",
      birthDate: defaultValues.birthDate || "",
      birthTime: defaultValues.birthTime || "",
      birthPlace: defaultValues.birthPlace || "",
      gender: defaultValues.gender || "",
      timezone: defaultValues.timezone || "UTC+8",
    },
  });

  const calculateBaziMutation = useMutation({
    mutationFn: async (data: BirthInfoFormData) => {
      const res = await apiRequest("POST", "/api/bazi-chart/calculate", {
        birthDate: data.birthDate,
        birthTime: data.birthTime,
        birthPlace: data.birthPlace,
        gender: data.gender,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || t("error"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bazi/chart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: BirthInfoFormData) => {
      const res = await apiRequest("PUT", "/api/profile", data);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || t("error"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveAndCalculate = async (data: BirthInfoFormData) => {
    try {
      await updateProfileMutation.mutateAsync(data);
      
      if (calculateBaziAfterSave && data.birthDate && data.birthTime && data.birthPlace && data.gender) {
        await calculateBaziMutation.mutateAsync(data);
        toast({
          title: t("success"),
          description: t("profileUpdated"),
        });
      } else {
        toast({
          title: t("success"),
          description: t("profileUpdated"),
        });
      }
      
      onSuccess?.();
    } catch (error) {
    }
  };

  const onSubmit = (data: BirthInfoFormData) => {
    saveAndCalculate(data);
  };

  const hourOptions = hourOptionsBase.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  const genderOptionsList = genderOptions.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  return {
    form,
    onSubmit,
    hourOptions,
    genderOptions: genderOptionsList,
    isPending: updateProfileMutation.isPending || calculateBaziMutation.isPending,
    isCalculating: calculateBaziMutation.isPending,
    isSaving: updateProfileMutation.isPending,
  };
}

export async function calculateBaziChart(data: {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  gender: string;
}) {
  const res = await apiRequest("POST", "/api/bazi-chart/calculate", data);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to calculate BaZi chart");
  }
  return res.json();
}
