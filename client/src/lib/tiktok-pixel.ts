declare global {
  interface Window {
    ttq: any;
  }
}

function getTtq() {
  return window.ttq;
}

async function sha256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : undefined;
}

function serverTrack(event: string, eventId: string, properties?: Record<string, any>) {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      event,
      event_id: eventId,
      properties: { ...properties, page_url: window.location.href },
      ttclid: getCookie("ttclid") || new URLSearchParams(window.location.search).get("ttclid") || undefined,
      ttp: getCookie("_ttp") || undefined,
    }),
  }).catch(() => {});
}

export async function ttqIdentify(params: {
  email?: string;
  externalId?: string;
}) {
  const ttq = getTtq();
  if (!ttq) return;

  const identifyData: Record<string, string> = {};

  if (params.externalId) {
    identifyData.external_id = await sha256(params.externalId);
  }
  if (params.email) {
    identifyData.email = await sha256(params.email);
  }

  if (Object.keys(identifyData).length > 0) {
    ttq.identify(identifyData);
  }
}

export function ttqTrackPageView() {
  const ttq = getTtq();
  if (!ttq) return;
  ttq.page();
}

export function ttqTrackCompleteRegistration(params: {
  userId: string;
  description?: string;
}) {
  const eventId = generateEventId();
  const ttq = getTtq();
  if (ttq) {
    ttq.track("CompleteRegistration", {
      event_id: eventId,
      contents: [
        {
          content_id: params.userId,
          content_type: "product",
          content_name: "User Registration",
          content_category: "registration",
        },
      ],
      description: params.description || "New user registration",
      status: "completed",
    });
  }
  serverTrack("CompleteRegistration", eventId, {
    content_id: params.userId,
    content_name: "User Registration",
    content_category: "registration",
    description: params.description || "New user registration",
  });
}

export function ttqTrackLogin(params: {
  userId: string;
}) {
  const eventId = generateEventId();
  const ttq = getTtq();
  if (ttq) {
    ttq.track("Login", {
      event_id: eventId,
      contents: [
        {
          content_id: params.userId,
          content_type: "product",
          content_name: "User Login",
          content_category: "login",
        },
      ],
      description: "User login",
      status: "completed",
    });
  }
  serverTrack("Login", eventId, {
    content_id: params.userId,
    content_name: "User Login",
    content_category: "login",
  });
}

export function ttqTrackViewContent(params: {
  contentId: string;
  contentName: string;
  contentCategory: string;
}) {
  const eventId = generateEventId();
  const ttq = getTtq();
  if (ttq) {
    ttq.track("ViewContent", {
      event_id: eventId,
      contents: [
        {
          content_id: params.contentId,
          content_type: "product",
          content_name: params.contentName,
          content_category: params.contentCategory,
        },
      ],
      status: "viewed",
    });
  }
  serverTrack("ViewContent", eventId, {
    content_id: params.contentId,
    content_name: params.contentName,
    content_category: params.contentCategory,
  });
}

export function ttqTrackInitiateCheckout(params: {
  planId: string;
  planName: string;
  price: number;
  currency?: string;
}) {
  const eventId = generateEventId();
  const ttq = getTtq();
  if (ttq) {
    ttq.track("InitiateCheckout", {
      event_id: eventId,
      contents: [
        {
          content_id: params.planId,
          content_type: "product",
          content_name: params.planName,
        },
      ],
      value: params.price,
      currency: params.currency || "USD",
    });
  }
  serverTrack("InitiateCheckout", eventId, {
    content_id: params.planId,
    content_name: params.planName,
    value: params.price,
    currency: params.currency || "USD",
  });
}

export function ttqTrackAddPaymentInfo(params: {
  planId: string;
  planName: string;
  price: number;
  currency?: string;
}) {
  const eventId = generateEventId();
  const ttq = getTtq();
  if (ttq) {
    ttq.track("AddPaymentInfo", {
      event_id: eventId,
      contents: [
        {
          content_id: params.planId,
          content_type: "product",
          content_name: params.planName,
        },
      ],
      value: params.price,
      currency: params.currency || "USD",
    });
  }
  serverTrack("AddPaymentInfo", eventId, {
    content_id: params.planId,
    content_name: params.planName,
    value: params.price,
    currency: params.currency || "USD",
  });
}

export function ttqTrackPlaceAnOrder(params: {
  planId: string;
  planName: string;
  price: number;
  currency?: string;
  orderId?: string;
}) {
  const eventId = params.orderId || generateEventId();
  const ttq = getTtq();
  if (ttq) {
    ttq.track("PlaceAnOrder", {
      event_id: eventId,
      contents: [
        {
          content_id: params.planId,
          content_type: "product",
          content_name: params.planName,
          price: params.price,
          quantity: 1,
        },
      ],
      value: params.price,
      currency: params.currency || "USD",
    });
  }
  serverTrack("PlaceAnOrder", eventId, {
    content_id: params.planId,
    content_name: params.planName,
    value: params.price,
    currency: params.currency || "USD",
    order_id: params.orderId,
  });
}

export function ttqTrackPurchase(params: {
  planId: string;
  planName: string;
  price: number;
  currency?: string;
  orderId?: string;
}) {
  const eventId = params.orderId || generateEventId();
  const ttq = getTtq();
  if (ttq) {
    ttq.track("CompletePayment", {
      event_id: eventId,
      contents: [
        {
          content_id: params.planId,
          content_type: "product",
          content_name: params.planName,
          content_category: "subscription",
          price: params.price,
          quantity: 1,
          brand: "Cosmic Destiny",
        },
      ],
      value: params.price,
      currency: params.currency || "USD",
      description: params.orderId || "",
      status: "completed",
    });
  }
  serverTrack("CompletePayment", eventId, {
    content_id: params.planId,
    content_name: params.planName,
    content_category: "subscription",
    value: params.price,
    currency: params.currency || "USD",
    order_id: params.orderId,
  });
}
