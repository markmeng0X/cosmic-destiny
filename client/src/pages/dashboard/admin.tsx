import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  UserPlus,
  CreditCard,
  Star,
  Sparkles,
  Activity,
  Crown,
  Heart,
  TrendingUp,
  Calendar,
  Eye,
  MousePointer,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalRegistrations: number;
  paidUsers: number;
  proUsers: number;
  eliteUsers: number;
  todayRegistrations: number;
  totalDivinations: number;
  totalFortunes: number;
  totalMatchings: number;
  totalBazi: number;
}

interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  created_at: string;
  nickname: string;
  preferred_language: string;
  birth_date: string;
  tier: string;
  stardust_balance: number;
  total_earned: number;
  total_spent: number;
  divination_count: number;
  fortune_count: number;
}

interface TrendItem {
  date: string;
  count: number;
}

interface PageViewTrendItem {
  date: string;
  page_views: number;
  unique_visitors: number;
}

interface PageViewData {
  trend: PageViewTrendItem[];
  today: {
    pageViews: number;
    uniqueVisitors: number;
  };
}

interface SubscriptionBreakdown {
  breakdown: Array<{ tier: string; count: number }>;
  freeWithoutSubscription: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number | string;
  icon: any;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function TierBadge({ tier }: { tier: string }) {
  switch (tier) {
    case "pro":
      return (
        <Badge className="bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 border-0">
          <Crown className="mr-1 h-3 w-3" />
          Pro
        </Badge>
      );
    case "elite":
      return (
        <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900 border-0">
          <Crown className="mr-1 h-3 w-3" />
          Elite
        </Badge>
      );
    default:
      return <Badge variant="secondary">Free</Badge>;
  }
}

function RegistrationChart({ data }: { data: TrendItem[] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data available</p>;
  }

  const maxCount = Math.max(...data.map((d) => Number(d.count)), 1);

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((item) => {
        const height = (Number(item.count) / maxCount) * 100;
        const dateStr = new Date(item.date).toLocaleDateString("en", { month: "short", day: "numeric" });
        return (
          <div
            key={item.date}
            className="flex flex-col items-center gap-1 flex-1 min-w-0"
          >
            <span className="text-[10px] text-muted-foreground">{item.count}</span>
            <div
              className="w-full bg-primary/80 rounded-t-sm min-h-[2px]"
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            <span className="text-[9px] text-muted-foreground truncate w-full text-center">
              {dateStr}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ data }: { data: PageViewTrendItem[] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data available yet</p>;
  }

  const pvValues = data.map((d) => Number(d.page_views));
  const uvValues = data.map((d) => Number(d.unique_visitors));
  const maxVal = Math.max(...pvValues, ...uvValues, 1);

  const chartWidth = 600;
  const chartHeight = 160;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 10;
  const padBottom = 30;
  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  const toX = (i: number) => padLeft + (i / Math.max(data.length - 1, 1)) * innerW;
  const toY = (v: number) => padTop + innerH - (v / maxVal) * innerH;

  const pvPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(Number(d.page_views))}`).join(" ");
  const uvPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(Number(d.unique_visitors))}`).join(" ");

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => {
    const y = padTop + innerH * (1 - pct);
    const val = Math.round(maxVal * pct);
    return { y, val };
  });

  const labelInterval = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto" data-testid="chart-pageviews">
        {gridLines.map((g) => (
          <g key={g.val}>
            <line x1={padLeft} y1={g.y} x2={chartWidth - padRight} y2={g.y} stroke="currentColor" strokeOpacity={0.1} />
            <text x={padLeft - 4} y={g.y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>{g.val}</text>
          </g>
        ))}
        <path d={pvPath} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeLinejoin="round" />
        <path d={uvPath} fill="none" stroke="hsl(var(--chart-2, 160 60% 45%))" strokeWidth={2} strokeLinejoin="round" strokeDasharray="4 2" />
        {data.map((d, i) => (
          <circle key={`pv-${i}`} cx={toX(i)} cy={toY(Number(d.page_views))} r={3} fill="hsl(var(--primary))" />
        ))}
        {data.map((d, i) => (
          <circle key={`uv-${i}`} cx={toX(i)} cy={toY(Number(d.unique_visitors))} r={2.5} fill="hsl(var(--chart-2, 160 60% 45%))" />
        ))}
        {data.map((d, i) => {
          if (i % labelInterval !== 0 && i !== data.length - 1) return null;
          const dateStr = new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" });
          return (
            <text key={`label-${i}`} x={toX(i)} y={chartHeight - 5} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
              {dateStr}
            </text>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1">
          <div className="h-[2px] w-4 bg-primary" />
          <span className="text-xs text-muted-foreground">Page Views</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-[2px] w-4 border-t-2 border-dashed" style={{ borderColor: "hsl(160 60% 45%)" }} />
          <span className="text-xs text-muted-foreground">Unique Visitors</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: trend } = useQuery<TrendItem[]>({
    queryKey: ["/api/admin/registrations-trend"],
  });

  const { data: subBreakdown } = useQuery<SubscriptionBreakdown>({
    queryKey: ["/api/admin/subscription-breakdown"],
  });

  const { data: pvData } = useQuery<PageViewData>({
    queryKey: ["/api/admin/pageviews-trend"],
  });

  if (statsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const conversionRate = stats && stats.totalRegistrations > 0
    ? ((stats.paidUsers / stats.totalRegistrations) * 100).toFixed(1)
    : "0";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-admin-title">Admin Analytics</h1>
        <p className="text-muted-foreground">Platform overview and user statistics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Users" value={stats?.totalRegistrations || 0} icon={Users} />
        <StatCard title="Today Signups" value={stats?.todayRegistrations || 0} icon={UserPlus} />
        <StatCard title="Paid Users" value={stats?.paidUsers || 0} icon={CreditCard} description={`${conversionRate}% conversion`} />
        <StatCard title="Today Visitors" value={pvData?.today.uniqueVisitors || 0} icon={Eye} description={`${pvData?.today.pageViews || 0} page views`} />
        <StatCard title="Today PV" value={pvData?.today.pageViews || 0} icon={MousePointer} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Pro" value={stats?.proUsers || 0} icon={Star} />
        <StatCard title="Elite" value={stats?.eliteUsers || 0} icon={Crown} />
        <StatCard title="BaZi Charts" value={stats?.totalBazi || 0} icon={Sparkles} />
        <StatCard title="Daily Fortunes" value={stats?.totalFortunes || 0} icon={Activity} />
        <StatCard title="Divinations" value={stats?.totalDivinations || 0} icon={TrendingUp} />
        <StatCard title="Matchings" value={stats?.totalMatchings || 0} icon={Heart} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4" />
            Visitor Trend (30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={pvData?.trend || []} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Registration Trend (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RegistrationChart data={trend || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              Subscription Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subBreakdown?.breakdown?.map((item) => {
                const total = (subBreakdown.breakdown.reduce((sum, b) => sum + Number(b.count), 0)) + subBreakdown.freeWithoutSubscription;
                const pct = total > 0 ? ((Number(item.count) / total) * 100).toFixed(0) : "0";
                return (
                  <div key={item.tier} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <TierBadge tier={item.tier} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.count}</span>
                      <span className="text-xs text-muted-foreground">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
              {subBreakdown && subBreakdown.freeWithoutSubscription > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline">No Subscription</Badge>
                  </div>
                  <span className="text-sm font-medium">{subBreakdown.freeWithoutSubscription}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            All Users ({users?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">User</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Tier</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Stardust</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Activity</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Language</th>
                    <th className="pb-2 font-medium text-muted-foreground">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((u) => (
                    <tr key={u.id} className="border-b last:border-0" data-testid={`row-user-${u.id}`}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={u.profile_image_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              {(u.first_name || u.nickname || "U")[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{u.nickname || u.first_name || "Anonymous"}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email || u.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <TierBadge tier={u.tier} />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-xs">
                          <span className="font-medium">{u.stardust_balance}</span>
                          <span className="text-muted-foreground"> bal</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          +{u.total_earned} / -{u.total_spent}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-xs text-muted-foreground">
                          {u.fortune_count} fortunes, {u.divination_count} divinations
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs">
                          {u.preferred_language || "en"}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
