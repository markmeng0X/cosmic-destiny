import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";
import { ttqIdentify, ttqTrackCompleteRegistration, ttqTrackLogin } from "@/lib/tiktok-pixel";

async function fetchUser(): Promise<User | null> {
  try {
    const response = await fetch("/api/auth/user", {
      credentials: "include",
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

async function logout(): Promise<void> {
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const identifiedRef = useRef(false);
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (user && !identifiedRef.current) {
      identifiedRef.current = true;

      (async () => {
        await ttqIdentify({
          externalId: user.id,
          email: user.email || undefined,
        });

        const ttclid = document.cookie.match(/(^| )ttclid=([^;]+)/)?.[2]
          || new URLSearchParams(window.location.search).get("ttclid")
          || undefined;
        const ttp = document.cookie.match(/(^| )_ttp=([^;]+)/)?.[2] || undefined;
        if (ttclid || ttp) {
          fetch("/api/track/ttclid", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ttclid, ttp }),
          }).catch(() => {});
        }

        if (user.createdAt) {
          const createdTime = new Date(user.createdAt).getTime();
          const now = Date.now();
          const isNewUser = now - createdTime < 5 * 60 * 1000;
          if (isNewUser) {
            ttqTrackCompleteRegistration({ userId: user.id });
          } else {
            ttqTrackLogin({ userId: user.id });
          }
        } else {
          ttqTrackLogin({ userId: user.id });
        }
      })();
    }
  }, [user]);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
