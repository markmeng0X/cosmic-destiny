import { Link, useLocation } from "wouter";
import {
  Sun,
  Star,
  Sparkles,
  Users,
  Settings,
  CreditCard,
  Gift,
  Smartphone,
  LogOut,
  Store,
  Crown,
  BarChart3,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

const ADMIN_USER_IDS = ["53036667"];

const navItems = [
  { icon: Sun, href: "/dashboard", labelKey: "dailyFortune" as const },
  { icon: Star, href: "/dashboard/bazi", labelKey: "baziReading" as const },
  { icon: Sparkles, href: "/dashboard/divination", labelKey: "aiDivination" as const },
  { icon: Users, href: "/dashboard/matching", labelKey: "compatibility" as const },
];

const accountItems = [
  { icon: Smartphone, href: "/dashboard/devices", labelKey: "devices" as const, disabled: true, badgeKey: "waitingOpen" as const },
  { icon: CreditCard, href: "/dashboard/subscription", labelKey: "subscription" as const },
  { icon: Gift, href: "/dashboard/referral", labelKey: "referral" as const },
  { icon: Settings, href: "/dashboard/settings", labelKey: "settings" as const },
];

const shopItems = [
  { icon: Store, href: "/dashboard/shop", labelKey: "mysticShop" as const },
];

export function AppSidebar() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const { data: subscription } = useQuery<{
    tier: "free" | "pro" | "elite";
    status: string;
  }>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  const tier = subscription?.tier || "free";

  const getTierLabel = () => {
    switch (tier) {
      case "pro":
        return t("galaxyExplorer");
      case "elite":
        return t("cosmicMaster");
      default:
        return t("free");
    }
  };

  const getAvatarRingStyle = () => {
    switch (tier) {
      case "pro":
        return "ring-2 ring-offset-2 ring-offset-sidebar-accent ring-[#C0C0C0]";
      case "elite":
        return "ring-2 ring-offset-2 ring-offset-sidebar-accent ring-[#FFD700]";
      default:
        return "";
    }
  };

  const getBadgeStyle = () => {
    switch (tier) {
      case "pro":
        return "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 border-0";
      case "elite":
        return "bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900 border-0";
      default:
        return "";
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-400" />
          <span className="text-lg font-bold">{t("appName")}</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("destinyFeatures")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={location === item.href}>
                    <Link href={item.href} data-testid={`nav-${item.labelKey}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("starMarket")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {shopItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={location === item.href}>
                    <Link href={item.href} data-testid="nav-shop">
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("accountManagement")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  {item.disabled ? (
                    <SidebarMenuButton
                      disabled
                      className="cursor-not-allowed opacity-50"
                      data-testid={`nav-${item.labelKey}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.labelKey)}</span>
                      {item.badgeKey && (
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {t(item.badgeKey)}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton asChild isActive={location === item.href}>
                      <Link href={item.href} data-testid={`nav-${item.labelKey}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{t(item.labelKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {user && ADMIN_USER_IDS.includes(user.id) && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/dashboard/admin"}>
                    <Link href="/dashboard/admin" data-testid="nav-admin">
                      <BarChart3 className="h-4 w-4" />
                      <span>Analytics</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
          <Avatar className={`h-10 w-10 ${getAvatarRingStyle()}`}>
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {user?.firstName?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.firstName || "User"}</p>
            <Badge 
              variant="secondary" 
              className={`text-xs ${getBadgeStyle()}`}
              data-testid="badge-subscription-tier"
            >
              {tier !== "free" && <Crown className="mr-1 h-3 w-3" />}
              {getTierLabel()}
            </Badge>
          </div>
          <button
            onClick={() => logout()}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
