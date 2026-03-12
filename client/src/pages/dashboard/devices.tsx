import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Smartphone,
  Watch,
  Plus,
  Trash2,
  RefreshCw,
  Settings,
  Bell,
  Check,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Device, PushHistory } from "@shared/schema";

const deviceTypes = [
  { value: "apple_watch", label: "Apple Watch", icon: Watch },
  { value: "mi_band", label: "小米手环", icon: Watch },
  { value: "android_phone", label: "Android手机", icon: Smartphone },
  { value: "iphone", label: "iPhone", icon: Smartphone },
];

export default function DevicesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState("");

  const { data: devices, isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  const { data: pushHistory, isLoading: historyLoading } = useQuery<PushHistory[]>({
    queryKey: ["/api/push-history"],
  });

  const mockDevices: Device[] = [
    {
      id: 1,
      userId: "user1",
      deviceType: "apple_watch",
      deviceName: "我的 Apple Watch",
      connectionStatus: "connected",
      lastSyncAt: new Date(),
      pushSettings: { dailyFortune: true, hourlyFortune: false, alerts: true },
      createdAt: new Date(),
    },
    {
      id: 2,
      userId: "user1",
      deviceType: "iphone",
      deviceName: "我的 iPhone",
      connectionStatus: "disconnected",
      lastSyncAt: new Date("2024-01-20"),
      pushSettings: { dailyFortune: true, hourlyFortune: true, alerts: true },
      createdAt: new Date(),
    },
  ];

  const mockPushHistory: PushHistory[] = [
    {
      id: 1,
      userId: "user1",
      deviceId: 1,
      contentType: "daily_fortune",
      content: "今日运势：78分 - 工作顺利，注意健康",
      pushedAt: new Date(),
    },
    {
      id: 2,
      userId: "user1",
      deviceId: 1,
      contentType: "hourly",
      content: "午时运势：事业运旺，适合洽谈",
      pushedAt: new Date(Date.now() - 3600000),
    },
  ];

  const displayDevices = devices || mockDevices;
  const displayHistory = pushHistory || mockPushHistory;

  const addDeviceMutation = useMutation({
    mutationFn: async (deviceType: string) => {
      const res = await apiRequest("POST", "/api/devices", { deviceType });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({ title: t("success"), description: "设备添加成功" });
      setAddDialogOpen(false);
    },
    onError: () => {
      toast({ title: t("error"), description: "添加失败", variant: "destructive" });
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const res = await apiRequest("DELETE", `/api/devices/${deviceId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({ title: t("success"), description: "设备已移除" });
    },
    onError: () => {
      toast({ title: t("error"), description: "移除失败", variant: "destructive" });
    },
  });

  const getDeviceIcon = (type: string) => {
    const deviceType = deviceTypes.find((d) => d.value === type);
    return deviceType?.icon || Smartphone;
  };

  const getDeviceLabel = (type: string) => {
    const deviceType = deviceTypes.find((d) => d.value === type);
    return deviceType?.label || type;
  };

  if (devicesLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">{t("devices")}</h1>
          <p className="text-muted-foreground">管理您的可穿戴设备和推送设置</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-device">
              <Plus className="h-4 w-4" />
              添加设备
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加新设备</DialogTitle>
              <DialogDescription>选择要连接的设备类型</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>设备类型</Label>
                <Select value={selectedDeviceType} onValueChange={setSelectedDeviceType}>
                  <SelectTrigger data-testid="select-device-type">
                    <SelectValue placeholder="选择设备类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                onClick={() => addDeviceMutation.mutate(selectedDeviceType)}
                disabled={!selectedDeviceType || addDeviceMutation.isPending}
                data-testid="button-confirm-add-device"
              >
                {addDeviceMutation.isPending ? t("loading") : "连接设备"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {displayDevices.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Watch className="mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">暂无连接设备</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                连接您的可穿戴设备，随时接收运势提醒
              </p>
              <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-first-device">
                <Plus className="mr-2 h-4 w-4" />
                添加第一个设备
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {displayDevices.map((device, index) => {
            const DeviceIcon = getDeviceIcon(device.deviceType);
            const isConnected = device.connectionStatus === "connected";
            const settings = device.pushSettings as {
              dailyFortune?: boolean;
              hourlyFortune?: boolean;
              alerts?: boolean;
            } | null;

            return (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
              >
                <Card className={isConnected ? "border-green-500/50" : ""}>
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${
                          isConnected ? "bg-green-500/20" : "bg-muted"
                        }`}
                      >
                        <DeviceIcon
                          className={`h-6 w-6 ${
                            isConnected ? "text-green-400" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {device.deviceName || getDeviceLabel(device.deviceType)}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isConnected ? "default" : "secondary"}
                            className={isConnected ? "bg-green-500" : ""}
                          >
                            {isConnected ? (
                              <>
                                <Wifi className="mr-1 h-3 w-3" />
                                已连接
                              </>
                            ) : (
                              <>
                                <WifiOff className="mr-1 h-3 w-3" />
                                未连接
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteDeviceMutation.mutate(device.id)}
                      data-testid={`button-delete-device-${device.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">上次同步</span>
                      <span>
                        {device.lastSyncAt
                          ? new Date(device.lastSyncAt).toLocaleString()
                          : "从未同步"}
                      </span>
                    </div>

                    <div className="space-y-3 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">每日运势推送</span>
                        </div>
                        <Switch
                          checked={settings?.dailyFortune ?? true}
                          data-testid={`switch-daily-fortune-${device.id}`}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">时辰运势推送</span>
                        </div>
                        <Switch
                          checked={settings?.hourlyFortune ?? false}
                          data-testid={`switch-hourly-fortune-${device.id}`}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">重要提醒</span>
                        </div>
                        <Switch
                          checked={settings?.alerts ?? true}
                          data-testid={`switch-alerts-${device.id}`}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>推送历史</CardTitle>
            <CardDescription>最近的推送记录</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {displayHistory.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
                  <Bell className="mb-2 h-8 w-8" />
                  <p className="text-sm">暂无推送记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayHistory.map((push) => (
                    <div
                      key={push.id}
                      className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
                        <Bell className="h-4 w-4 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{push.content}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(push.pushedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
