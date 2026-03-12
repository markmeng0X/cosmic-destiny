import { createHash } from "crypto";

const TIKTOK_API_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const PIXEL_ID = "D65L8EJC77U5GADIL890";

function sha256Hash(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

interface TikTokUser {
  email?: string;
  external_id?: string;
  ip?: string;
  user_agent?: string;
  ttclid?: string;
  ttp?: string;
  locale?: string;
}

interface TikTokEventProperties {
  value?: number;
  currency?: string;
  content_id?: string;
  content_type?: string;
  content_name?: string;
  content_category?: string;
  contents?: Array<{
    content_id?: string;
    content_type?: string;
    content_name?: string;
    content_category?: string;
    price?: number;
    quantity?: number;
    brand?: string;
  }>;
  description?: string;
  status?: string;
  num_items?: number;
  url?: string;
  search_string?: string;
  event_id?: string;
}

interface ServerEventParams {
  event: string;
  user: TikTokUser;
  properties?: TikTokEventProperties;
  eventId?: string;
  url?: string;
}

async function sendEvent(params: ServerEventParams): Promise<void> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn("[TikTok Events API] No TIKTOK_ACCESS_TOKEN configured, skipping server event");
    return;
  }

  const userData: Record<string, string> = {};
  if (params.user.external_id) {
    userData.external_id = sha256Hash(params.user.external_id);
  }
  if (params.user.email) {
    userData.email = sha256Hash(params.user.email);
  }
  if (params.user.ip) {
    userData.ip = params.user.ip;
  }
  if (params.user.user_agent) {
    userData.user_agent = params.user.user_agent;
  }
  if (params.user.ttclid) {
    userData.ttclid = params.user.ttclid;
  }
  if (params.user.ttp) {
    userData.ttp = params.user.ttp;
  }
  if (params.user.locale) {
    userData.locale = params.user.locale;
  }

  const resolvedEventId = params.eventId || `${params.event}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const eventData: Record<string, any> = {
    event: params.event,
    event_time: Math.floor(Date.now() / 1000),
    event_id: resolvedEventId,
    user: userData,
  };

  if (params.properties) {
    const props: Record<string, any> = {};
    if (params.properties.value !== undefined) props.value = params.properties.value;
    if (params.properties.currency) props.currency = params.properties.currency;
    if (params.properties.content_type) props.content_type = params.properties.content_type;
    if (params.properties.contents) props.contents = params.properties.contents;
    if (params.properties.description) props.description = params.properties.description;
    if (params.properties.status) props.status = params.properties.status;
    if (params.properties.num_items !== undefined) props.num_items = params.properties.num_items;
    if (params.properties.search_string) props.query = params.properties.search_string;
    if (params.url) props.url = params.url;
    eventData.properties = props;
  }

  const payload = {
    event_source: "web",
    event_source_id: PIXEL_ID,
    data: [eventData],
  };

  try {
    const response = await fetch(TIKTOK_API_URL, {
      method: "POST",
      headers: {
        "Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.code !== 0) {
      console.error("[TikTok Events API] Error:", result.message, JSON.stringify(result));
    } else {
      console.log(`[TikTok Events API] ${params.event} sent successfully`);
    }
  } catch (error) {
    console.error("[TikTok Events API] Request failed:", error);
  }
}

function extractClientContext(req: any, storedTtclid?: string, storedTtp?: string): { ip: string; userAgent: string; ttclid?: string; ttp?: string; url?: string; eventId?: string; locale?: string } {
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
    || req.headers["x-real-ip"]?.toString()
    || req.socket?.remoteAddress
    || "";
  const userAgent = req.headers["user-agent"] || "";
  const ttclid = req.body?.ttclid || req.query?.ttclid || storedTtclid;
  const ttp = req.body?.ttp || req.query?.ttp || storedTtp;
  const url = req.body?.page_url || req.body?.properties?.page_url || req.headers?.referer || "";
  const eventId = req.body?.event_id;
  const locale = req.headers["accept-language"]?.toString().split(",")[0]?.replace("-", "_") || "";
  return { ip, userAgent, ttclid, ttp, url, eventId, locale };
}

export function trackCompleteRegistration(req: any, userId: string, email?: string) {
  const ctx = extractClientContext(req);
  sendEvent({
    event: "CompleteRegistration",
    eventId: ctx.eventId,
    user: {
      external_id: userId,
      email,
      ip: ctx.ip,
      user_agent: ctx.userAgent,
      ttclid: ctx.ttclid,
      ttp: ctx.ttp,
      locale: ctx.locale,
    },
    properties: {
      content_id: userId,
      content_type: "product",
      content_name: "User Registration",
      content_category: "registration",
      description: "New user registration",
      status: "completed",
    },
    url: ctx.url,
  });
}

export function trackLogin(req: any, userId: string, email?: string) {
  const ctx = extractClientContext(req);
  sendEvent({
    event: "Login",
    eventId: ctx.eventId,
    user: {
      external_id: userId,
      email,
      ip: ctx.ip,
      user_agent: ctx.userAgent,
      ttclid: ctx.ttclid,
      ttp: ctx.ttp,
      locale: ctx.locale,
    },
    properties: {
      content_id: userId,
      content_type: "product",
      content_name: "User Login",
      content_category: "login",
      description: "User login",
      status: "completed",
    },
    url: ctx.url,
  });
}

export function trackViewContent(req: any, userId: string, email: string | undefined, contentId: string, contentName: string, contentCategory: string) {
  const ctx = extractClientContext(req);
  sendEvent({
    event: "ViewContent",
    eventId: ctx.eventId,
    user: {
      external_id: userId,
      email,
      ip: ctx.ip,
      user_agent: ctx.userAgent,
      ttclid: ctx.ttclid,
      ttp: ctx.ttp,
      locale: ctx.locale,
    },
    properties: {
      contents: [{ content_id: contentId, content_type: "product", content_name: contentName, content_category: contentCategory }],
      status: "viewed",
    },
    url: ctx.url,
  });
}

export function trackInitiateCheckout(req: any, userId: string, email: string | undefined, planId: string, planName: string, price: number, currency = "USD") {
  const ctx = extractClientContext(req);
  sendEvent({
    event: "InitiateCheckout",
    eventId: ctx.eventId,
    user: {
      external_id: userId,
      email,
      ip: ctx.ip,
      user_agent: ctx.userAgent,
      ttclid: ctx.ttclid,
      ttp: ctx.ttp,
      locale: ctx.locale,
    },
    properties: {
      value: price,
      currency,
      content_type: "product",
      contents: [{ content_id: planId, content_type: "product", content_name: planName, price, quantity: 1 }],
    },
    url: ctx.url,
  });
}

export function trackAddPaymentInfo(req: any, userId: string, email: string | undefined, planId: string, planName: string, price: number, currency = "USD") {
  const ctx = extractClientContext(req);
  sendEvent({
    event: "AddPaymentInfo",
    eventId: ctx.eventId,
    user: {
      external_id: userId,
      email,
      ip: ctx.ip,
      user_agent: ctx.userAgent,
      ttclid: ctx.ttclid,
      ttp: ctx.ttp,
      locale: ctx.locale,
    },
    properties: {
      value: price,
      currency,
      content_type: "product",
      contents: [{ content_id: planId, content_type: "product", content_name: planName, price, quantity: 1 }],
    },
    url: ctx.url,
  });
}

export function trackPlaceAnOrder(req: any, userId: string, email: string | undefined, planId: string, planName: string, price: number, currency = "USD", orderId?: string) {
  const ctx = extractClientContext(req);
  sendEvent({
    event: "PlaceAnOrder",
    eventId: ctx.eventId || orderId,
    user: {
      external_id: userId,
      email,
      ip: ctx.ip,
      user_agent: ctx.userAgent,
      ttclid: ctx.ttclid,
      ttp: ctx.ttp,
      locale: ctx.locale,
    },
    properties: {
      value: price,
      currency,
      content_type: "product",
      contents: [{ content_id: planId, content_type: "product", content_name: planName, price, quantity: 1 }],
    },
    url: ctx.url,
  });
}

export function trackPurchase(req: any, userId: string, email: string | undefined, planId: string, planName: string, price: number, currency = "USD", orderId?: string) {
  const ctx = extractClientContext(req);
  sendEvent({
    event: "CompletePayment",
    eventId: ctx.eventId || orderId,
    user: {
      external_id: userId,
      email,
      ip: ctx.ip,
      user_agent: ctx.userAgent,
      ttclid: ctx.ttclid,
      ttp: ctx.ttp,
      locale: ctx.locale,
    },
    properties: {
      value: price,
      currency,
      content_type: "product",
      contents: [{ content_id: planId, content_type: "product", content_name: planName, price, quantity: 1, brand: "Cosmic Destiny" }],
      description: orderId || "",
      status: "completed",
      num_items: 1,
    },
    url: ctx.url,
  });
}

export function trackServerEvent(req: any, event: string, userId: string, email: string | undefined, properties?: TikTokEventProperties) {
  const ctx = extractClientContext(req);
  sendEvent({
    event,
    eventId: ctx.eventId,
    user: {
      external_id: userId,
      email,
      ip: ctx.ip,
      user_agent: ctx.userAgent,
      ttclid: ctx.ttclid,
      ttp: ctx.ttp,
      locale: ctx.locale,
    },
    properties,
    url: ctx.url,
  });
}
