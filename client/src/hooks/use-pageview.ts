import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

function getSessionId(): string {
  let sid = sessionStorage.getItem("cosmic-sid");
  if (!sid) {
    sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem("cosmic-sid", sid);
  }
  return sid;
}

export function usePageView(userId?: string) {
  const [location] = useLocation();
  const lastPath = useRef("");

  useEffect(() => {
    if (location === lastPath.current) return;
    lastPath.current = location;

    const sessionId = getSessionId();
    fetch("/api/track/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        path: location,
        referrer: document.referrer || null,
        userId: userId || null,
      }),
    }).catch(() => {});
  }, [location, userId]);
}
