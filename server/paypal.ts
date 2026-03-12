// PayPal integration (blueprint:javascript_paypal)
import {
  Client,
  Environment,
  LogLevel,
  OAuthAuthorizationController,
  OrdersController,
} from "@paypal/paypal-server-sdk";
import { Request, Response } from "express";

/* PayPal Controllers Setup */

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE } = process.env;

const paypalEnabled = !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);

// PAYPAL_MODE: "sandbox" (default) or "live"
const isPayPalLive = PAYPAL_MODE === "live";

if (!paypalEnabled) {
  console.warn("PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to enable payments.");
} else {
  console.log(`PayPal configured in ${isPayPalLive ? "LIVE" : "SANDBOX"} mode`);
}

let ordersController: OrdersController | null = null;
let oAuthAuthorizationController: OAuthAuthorizationController | null = null;

if (paypalEnabled) {
  const client = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: PAYPAL_CLIENT_ID!,
      oAuthClientSecret: PAYPAL_CLIENT_SECRET!,
    },
    timeout: 0,
    environment: isPayPalLive ? Environment.Production : Environment.Sandbox,
    logging: {
      logLevel: LogLevel.Info,
      logRequest: {
        logBody: true,
      },
      logResponse: {
        logHeaders: true,
      },
    },
  });
  ordersController = new OrdersController(client);
  oAuthAuthorizationController = new OAuthAuthorizationController(client);
}

/* Token generation helpers */

export async function getClientToken() {
  if (!oAuthAuthorizationController) {
    throw new Error("PayPal not configured");
  }
  
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");

  const { result } = await oAuthAuthorizationController.requestToken(
    {
      authorization: `Basic ${auth}`,
    },
    { intent: "sdk_init", response_type: "client_token" },
  );

  return result.accessToken;
}

/*  Process transactions */

export async function createPaypalOrder(req: Request, res: Response) {
  if (!ordersController) {
    return res.status(503).json({ error: "PayPal not configured" });
  }
  
  try {
    const { amount, currency, intent } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res
        .status(400)
        .json({
          error: "Invalid amount. Amount must be a positive number.",
        });
    }

    if (!currency) {
      return res
        .status(400)
        .json({ error: "Invalid currency. Currency is required." });
    }

    if (!intent) {
      return res
        .status(400)
        .json({ error: "Invalid intent. Intent is required." });
    }

    const formattedAmount = parseFloat(amount).toFixed(2);

    const collect = {
      body: {
        intent: intent,
        purchaseUnits: [
          {
            amount: {
              currencyCode: currency,
              value: formattedAmount,
            },
          },
        ],
      },
      prefer: "return=minimal",
    };

    const { body, ...httpResponse } =
          await ordersController.createOrder(collect);

    const jsonResponse = JSON.parse(String(body));
    const httpStatusCode = httpResponse.statusCode;

    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
}

export async function capturePaypalOrder(req: Request, res: Response) {
  if (!ordersController) {
    return res.status(503).json({ error: "PayPal not configured" });
  }
  
  try {
    const { orderID } = req.params;
    const collect = {
      id: orderID,
      prefer: "return=minimal",
    };

    const { body, ...httpResponse } =
          await ordersController.captureOrder(collect);

    const jsonResponse = JSON.parse(String(body));
    const httpStatusCode = httpResponse.statusCode;

    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
}

export async function loadPaypalDefault(req: Request, res: Response) {
  if (!paypalEnabled) {
    return res.status(503).json({ error: "PayPal not configured" });
  }
  
  try {
    const clientToken = await getClientToken();
    res.json({
      clientToken,
      clientId: PAYPAL_CLIENT_ID,
      mode: isPayPalLive ? "live" : "sandbox",
    });
  } catch (error) {
    console.error("Failed to get client token:", error);
    res.status(500).json({ error: "Failed to initialize PayPal" });
  }
}
