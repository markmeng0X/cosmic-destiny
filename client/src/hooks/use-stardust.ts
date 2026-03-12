import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { STARDUST_COSTS, type StardustAccount } from "@shared/schema";

export function useStardust() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: account, isLoading } = useQuery<StardustAccount & { points: number; hasCheckedInToday: boolean }>({
    queryKey: ["/api/stardust"],
  });

  const consumeMutation = useMutation({
    mutationFn: async ({ actionType, requiredAmount, description }: { 
      actionType: keyof typeof STARDUST_COSTS; 
      requiredAmount: number;
      description?: string;
    }) => {
      const response = await apiRequest("POST", "/api/stardust/consume", {
        actionType,
        requiredAmount,
        description,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stardust"] });
      toast({
        title: "星尘消耗",
        description: `已消耗 ${data.consumed} 星尘，余额: ${data.newBalance}`,
      });
    },
    onError: (error: any) => {
      if (error.message?.includes("402") || error.status === 402) {
        toast({
          title: "星尘不足",
          description: "您的星尘余额不足，请获取更多星尘或升级订阅",
          variant: "destructive",
        });
      } else {
        toast({
          title: "消耗失败",
          description: error.message || "操作失败，请重试",
          variant: "destructive",
        });
      }
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stardust/check-in", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stardust"] });
      const bonus = data.consecutiveCheckIns === 7 ? " (连续7天奖励+50)" : "";
      toast({
        title: "签到成功",
        description: `获得 ${data.pointsEarned} 星尘${bonus}，连续签到 ${data.consecutiveCheckIns} 天`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "签到失败",
        description: error.message || "今日已签到",
        variant: "destructive",
      });
    },
  });

  const consumeForAction = async (actionType: keyof typeof STARDUST_COSTS): Promise<boolean> => {
    const cost = STARDUST_COSTS[actionType];
    
    if (!account || account.balance < cost) {
      toast({
        title: "星尘不足",
        description: `此操作需要 ${cost} 星尘，当前余额: ${account?.balance || 0}`,
        variant: "destructive",
      });
      return false;
    }

    try {
      await consumeMutation.mutateAsync({
        actionType,
        requiredAmount: cost,
      });
      return true;
    } catch {
      return false;
    }
  };

  return {
    account,
    balance: account?.balance || 0,
    isLoading,
    hasCheckedInToday: account?.hasCheckedInToday || false,
    consumeForAction,
    consumeMutation,
    checkInMutation,
    COSTS: STARDUST_COSTS,
  };
}
