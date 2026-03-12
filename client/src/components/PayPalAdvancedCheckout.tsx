// PayPal JavaScript SDK v6 Integration
// Following official docs: https://docs.paypal.ai
import { useEffect, useState, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "paypal-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { type?: string; hidden?: boolean },
        HTMLElement
      >;
    }
  }
}

interface PayPalAdvancedCheckoutProps {
  amount: string;
  currency: string;
  intent: string;
  onSuccess?: (orderId: string) => void;
  onError?: (error: any) => void;
}

export default function PayPalAdvancedCheckout({
  amount,
  currency,
  intent,
  onSuccess,
  onError,
}: PayPalAdvancedCheckoutProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const initCalledRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;

    const loadPayPalSDK = async () => {
      try {
        const setupRes = await fetch("/api/paypal/setup");
        const setupData = await setupRes.json();

        if (setupData.error) {
          setInitError(setupData.error);
          setLoading(false);
          return;
        }

        const isLive = setupData.mode === "live";
        const sdkUrl = isLive
          ? "https://www.paypal.com/web-sdk/v6/core"
          : "https://www.sandbox.paypal.com/web-sdk/v6/core";

        if (!(window as any).paypal) {
          const script = document.createElement("script");
          script.src = sdkUrl;
          script.async = true;
          script.onload = () => initPayPal(setupData.clientToken);
          script.onerror = () => {
            setInitError("Failed to load PayPal SDK");
            setLoading(false);
          };
          document.body.appendChild(script);
        } else {
          await initPayPal(setupData.clientToken);
        }
      } catch (e) {
        console.error("Failed to load PayPal SDK", e);
        setInitError("Failed to initialize PayPal");
        setLoading(false);
      }
    };

    loadPayPalSDK();

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const createOrder = async () => {
    const orderPayload = {
      amount,
      currency,
      intent,
    };
    const response = await fetch("/api/paypal/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    const output = await response.json();
    return { orderId: output.id };
  };

  const captureOrder = async (orderId: string) => {
    const response = await fetch(`/api/paypal/order/${orderId}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return data;
  };

  const initPayPal = async (clientToken: string) => {
    try {
      const sdkInstance = await (window as any).paypal.createInstance({
        clientToken,
        components: ["paypal-payments"],
        pageType: "checkout",
      });

      const paymentMethods = await sdkInstance.findEligibleMethods({
        currencyCode: currency,
      });

      console.log("PayPal eligible:", paymentMethods.isEligible("paypal"));

      if (paymentMethods.isEligible("paypal")) {
        const paypalPaymentSession =
          sdkInstance.createPayPalOneTimePaymentSession({
            async onApprove(data: any) {
              console.log("Payment approved:", data);
              try {
                const orderData = await captureOrder(data.orderId);
                console.log("Capture result:", orderData);
                if (orderData.status === "COMPLETED" && onSuccess) {
                  onSuccess(data.orderId);
                } else if (onError) {
                  onError(new Error("Payment not completed"));
                }
              } catch (error) {
                console.error("Payment capture failed:", error);
                if (onError) onError(error);
              }
            },
            onCancel(data: any) {
              console.log("Payment cancelled:", data);
            },
            onError(error: any) {
              console.error("Payment error:", error);
              if (onError) onError(error);
            },
          });

        const paypalButton = document.getElementById("paypal-button");
        if (paypalButton) {
          paypalButton.removeAttribute("hidden");

          const onClick = async () => {
            try {
              const createOrderPromise = createOrder();
              await paypalPaymentSession.start(
                { presentationMode: "auto" },
                createOrderPromise,
              );
            } catch (error: any) {
              console.error("PayPal payment start error:", error);
            }
          };

          paypalButton.addEventListener("click", onClick);

          cleanupRef.current = () => {
            paypalButton.removeEventListener("click", onClick);
          };
        }
      } else {
        console.warn("PayPal payment method is not eligible");
        setInitError("PayPal is not available for this payment");
      }

      setLoading(false);
    } catch (e) {
      console.error("PayPal init error:", e);
      setInitError("PayPal initialization failed");
      setLoading(false);
    }
  };

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3" data-testid="payment-error">
        <ShieldCheck className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground text-center">{initError}</p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          data-testid="button-retry-payment"
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="payment-advanced-checkout">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-green-500" />
        <span>{t("securePayment")}</span>
      </div>

      <Card className="p-4" data-testid="paypal-payment-section">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">{t("payWithPayPal")}</p>
          {loading && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
              <span className="text-sm text-muted-foreground">{t("processing")}</span>
            </div>
          )}
          <div className="w-full flex justify-center" style={{ minHeight: 45 }}>
            <paypal-button id="paypal-button" type="pay" hidden data-testid="button-pay-paypal" />
          </div>
        </div>
      </Card>
    </div>
  );
}
