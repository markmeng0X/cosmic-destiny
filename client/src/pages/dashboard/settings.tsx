import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Calendar,
  Clock,
  MapPin,
  Globe,
  Bell,
  Palette,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  FormDescription,
} from "@/components/ui/form";
import { useI18n, type Language } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { timezoneOptions } from "@/components/timezone-provider";
import type { UserProfile } from "@shared/schema";

type ProfileForm = {
  nickname: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  timezone?: string;
  birthPlace?: string;
  preferredCulture?: string;
  preferredLanguage?: string;
  notificationEnabled?: boolean;
  notificationTime?: string;
};

const languages: { value: Language; label: string }[] = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
];

export default function SettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();

  const profileSchema = z.object({
    nickname: z.string().min(1, t("nicknameRequired")),
    gender: z.string().optional(),
    birthDate: z.string().optional(),
    birthTime: z.string().optional(),
    timezone: z.string().optional(),
    birthPlace: z.string().optional(),
    preferredCulture: z.string().optional(),
    preferredLanguage: z.string().optional(),
    notificationEnabled: z.boolean().optional(),
    notificationTime: z.string().optional(),
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

  const cultures = [
    { value: "china", label: t("chinaMyth") },
    { value: "japan", label: t("japanRpg") },
    { value: "western", label: t("westernFantasy") },
    { value: "buddhist", label: t("buddhist") },
    { value: "arabic", label: t("arabic") },
    { value: "pokemon", label: t("pokemon") },
    { value: "marvel", label: t("marvel") },
    { value: "genshin", label: t("genshin") },
  ];

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nickname: profile?.nickname || (user?.firstName ? `${user.firstName}${user.lastName || ''}` : "") || "",
      gender: profile?.gender || "",
      birthDate: profile?.birthDate ? new Date(profile.birthDate).toISOString().split("T")[0] : "",
      birthTime: profile?.birthTime || "",
      timezone: profile?.timezone || "UTC+8",
      birthPlace: profile?.birthPlace || "",
      preferredCulture: profile?.preferredCulture || "china",
      preferredLanguage: profile?.preferredLanguage || "zh",
      notificationEnabled: profile?.notificationEnabled ?? true,
      notificationTime: profile?.notificationTime || "08:00",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
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
    mutationFn: async (data: ProfileForm) => {
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

  const onSubmit = async (data: ProfileForm) => {
    if (data.preferredLanguage) {
      setLanguage(data.preferredLanguage as Language);
    }
    
    try {
      await updateMutation.mutateAsync(data);
      
      if (data.birthDate && data.birthTime && data.birthPlace && data.gender) {
        await calculateBaziMutation.mutateAsync(data);
      }
      
      toast({ title: t("success"), description: t("settingsSaved") });
    } catch (error) {
      console.error("Settings save error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">{t("profileSettings")}</h1>
        <p className="text-muted-foreground">{t("settings")}</p>
      </motion.div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("birthInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                      {user?.firstName?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("nickname")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("nickname")}
                            data-testid="input-nickname"
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
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t("birthInfo")}
                </CardTitle>
                <CardDescription>{t("birthInfoDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
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
                            data-testid="input-settings-birth-date"
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
                            <SelectTrigger data-testid="select-settings-birth-time">
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
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          {t("timezone")}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-settings-birth-timezone">
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
                            placeholder={t("enterBirthPlace")}
                            data-testid="input-settings-birth-place"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                  <Palette className="h-5 w-5" />
                  {t("settings")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="preferredCulture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("preferredCulture")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-preferred-culture">
                              <SelectValue placeholder={t("culture")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cultures.map((culture) => (
                              <SelectItem key={culture.value} value={culture.value}>
                                {culture.label}
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
                    name="preferredLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          {t("preferredLanguage")}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-preferred-language">
                              <SelectValue placeholder={t("preferredLanguage")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {languages.map((lang) => (
                              <SelectItem key={lang.value} value={lang.value}>
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {t("notifications")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="notificationEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t("enableNotifications")}</FormLabel>
                        <FormDescription>
                          {t("dailyFortune")}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-notification"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notificationTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("notificationTime")}</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          data-testid="input-notification-time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              type="submit"
              disabled={updateMutation.isPending || calculateBaziMutation.isPending}
              className="gap-2"
              data-testid="button-save-settings"
            >
              <Save className="h-4 w-4" />
              {updateMutation.isPending || calculateBaziMutation.isPending ? t("loading") : t("save")}
            </Button>
          </motion.div>
        </form>
      </Form>
    </div>
  );
}
