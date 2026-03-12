import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Scroll,
  Gem,
  Flame,
  GraduationCap,
  Package,
  ExternalLink,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

const WHATSAPP_URL = "https://wa.me/8613402037254";

export default function ShopPage() {
  const { t } = useI18n();

  const shopItems = [
    {
      id: "master-consultation",
      icon: MessageCircle,
      title: t("masterConsultation"),
      description: t("masterConsultationDesc"),
      price: "$300",
      unit: t("perHour"),
      highlight: true,
    },
    {
      id: "talisman",
      icon: Scroll,
      title: t("talisman"),
      description: t("talismanDesc"),
      price: "$399",
      unit: t("perItem"),
    },
    {
      id: "bracelet",
      icon: Gem,
      title: t("bracelet"),
      description: t("braceletDesc"),
      price: "$300",
      unit: t("perItem"),
    },
    {
      id: "ritual",
      icon: Flame,
      title: t("ritual"),
      description: t("ritualDesc"),
      price: "$3,000",
      unit: t("perSession"),
      premium: true,
    },
    {
      id: "apprenticeship",
      icon: GraduationCap,
      title: t("apprenticeship"),
      description: t("apprenticeshipDesc"),
      price: t("negotiable"),
      unit: "",
      special: true,
    },
  ];

  const handleWhatsAppClick = () => {
    window.open(WHATSAPP_URL, "_blank");
  };

  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold">{t("shopTitle")}</h1>
        <p className="text-muted-foreground">
          {t("shopDesc")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-green-500/30 bg-green-500/10 p-4"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500">
              <SiWhatsapp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">{t("whatsappConsult")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("whatsappDesc")}
              </p>
            </div>
          </div>
          <Button
            onClick={handleWhatsAppClick}
            className="gap-2 bg-green-500 hover:bg-green-600"
            data-testid="button-whatsapp"
          >
            <SiWhatsapp className="h-4 w-4" />
            {t("consultNow")}
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {shopItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
          >
            <Card
              className={`relative h-full overflow-hidden ${
                item.premium
                  ? "border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10"
                  : item.highlight
                  ? "border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-pink-500/10"
                  : item.special
                  ? "border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 to-blue-500/10"
                  : ""
              }`}
            >
              {item.premium && (
                <Badge className="absolute right-3 top-3 bg-amber-500">
                  {t("premiumService")}
                </Badge>
              )}
              {item.highlight && (
                <Badge className="absolute right-3 top-3 bg-purple-500">
                  {t("hotRecommend")}
                </Badge>
              )}
              {item.special && (
                <Badge className="absolute right-3 top-3 bg-cyan-500">
                  {t("rareOpportunity")}
                </Badge>
              )}
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-sm leading-relaxed">
                  {item.description}
                </CardDescription>
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-2xl font-bold text-primary">
                    {item.price}
                  </span>
                  {item.unit && (
                    <span className="text-sm text-muted-foreground">
                      /{item.unit}
                    </span>
                  )}
                </div>
                <Button
                  onClick={handleWhatsAppClick}
                  variant="outline"
                  className="w-full gap-2"
                  data-testid={`button-order-${item.id}`}
                >
                  <SiWhatsapp className="h-4 w-4" />
                  {t("consultNow")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-lg border bg-muted/30 p-4"
      >
        <div className="flex items-start gap-3">
          <Package className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <h4 className="font-medium">{t("shippingInfo")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("shippingInfoDesc")}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
