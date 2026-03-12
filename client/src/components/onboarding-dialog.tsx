import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles, User, Calendar, Clock, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { timezoneOptions } from "@/components/timezone-provider";
import type { UserProfile } from "@shared/schema";

type OnboardingForm = {
  nickname: string;
  birthDate: string;
  birthTime: string;
  timezone: string;
  birthPlace: string;
  gender: string;
};

export function OnboardingDialog() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const onboardingSchema = z.object({
    nickname: z.string().min(1, t("nicknameRequired")),
    birthDate: z.string().min(1, t("birthDateRequired")),
    birthTime: z.string().min(1, t("birthTimeRequired")),
    timezone: z.string().min(1, t("timezoneRequired")),
    birthPlace: z.string().optional(),
    gender: z.string().optional(),
  });

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

  const genderOptions = [
    { value: "male", label: t("male") },
    { value: "female", label: t("female") },
  ];

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      nickname: "",
      birthDate: "",
      birthTime: "",
      timezone: "UTC+8",
      birthPlace: "",
      gender: "",
    },
  });

  useEffect(() => {
    if (!isLoading && profile && !hasChecked) {
      setHasChecked(true);
      if (!profile.birthDate || !profile.birthTime) {
        setOpen(true);
        form.reset({
          nickname: profile.nickname || "",
          birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split("T")[0] : "",
          birthTime: profile.birthTime || "",
          timezone: profile.timezone || "UTC+8",
          birthPlace: profile.birthPlace || "",
          gender: profile.gender || "",
        });
      }
    }
  }, [isLoading, profile, hasChecked, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: OnboardingForm) => {
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
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    },
  });

  const calculateBaziMutation = useMutation({
    mutationFn: async (data: OnboardingForm) => {
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
    },
    onError: (error: Error) => {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = async (data: OnboardingForm) => {
    try {
      await updateMutation.mutateAsync(data);
      
      if (data.birthDate && data.birthTime && data.birthPlace && data.gender) {
        await calculateBaziMutation.mutateAsync(data);
      }
      
      toast({ title: t("success"), description: t("profileUpdated") });
      setOpen(false);
    } catch (error) {
      console.error("Onboarding save error:", error);
    }
  };

  if (isLoading) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-onboarding">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("welcomeSetup")}
          </DialogTitle>
          <DialogDescription>
            {t("welcomeSetupDesc")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t("nickname")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("nickname")}
                      {...field}
                      data-testid="input-onboarding-nickname"
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
                      <SelectTrigger data-testid="select-onboarding-gender">
                        <SelectValue placeholder={t("selectGender")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {genderOptions.map((option) => (
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
                      {...field}
                      data-testid="input-onboarding-birthdate"
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
                      <SelectTrigger data-testid="select-onboarding-birthtime">
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
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("timezone")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-onboarding-timezone">
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
              name="birthPlace"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {t("birthPlace")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("birthPlaceHint")}
                      {...field}
                      data-testid="input-onboarding-birthplace"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={updateMutation.isPending || calculateBaziMutation.isPending}
              data-testid="button-onboarding-submit"
            >
              {updateMutation.isPending || calculateBaziMutation.isPending ? t("saving") : t("continueButton")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
