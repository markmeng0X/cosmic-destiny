import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Globe, Sparkles, Zap, Brain, Shield, Layers, Database, ChevronRight,
  Twitter, Github, Linkedin, Star, Castle, Swords, Hand, Building2, 
  CircleDot, Flame, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CosmicBackground } from "@/components/cosmic-background";
import { LanguageSelector } from "@/components/language-selector";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";

export default function LandingPage() {
  const { t } = useI18n();
  const { user, isAuthenticated, isLoading } = useAuth();

  const coreFeatures = [
    { 
      icon: Globe, 
      title: t("globalTitle"), 
      subtitle: "Global",
      desc: t("globalDesc"),
      color: "bg-purple-600"
    },
    { 
      icon: Sparkles, 
      title: t("multiCulturalTitle"), 
      subtitle: "Multi-Cultural",
      desc: t("multiCulturalDesc"),
      color: "bg-pink-500"
    },
    { 
      icon: Zap, 
      title: t("realTimeTitle"), 
      subtitle: "Real-time",
      desc: t("realTimeDesc"),
      color: "bg-emerald-500"
    },
    { 
      icon: Brain, 
      title: t("aiPoweredTitle"), 
      subtitle: "AI-Powered",
      desc: t("aiPoweredDesc"),
      color: "bg-orange-500"
    },
  ];

  const protocolFeatures = [
    { icon: Database, title: t("smartAlgorithm"), desc: t("smartAlgorithmDesc") },
    { icon: Layers, title: t("preciseData"), desc: t("preciseDataDesc") },
    { icon: Shield, title: t("privacyProtection"), desc: t("privacyProtectionDesc") },
    { icon: Sparkles, title: t("multiDimensional"), desc: t("multiDimensionalDesc") },
  ];

  const cultureSystems = [
    { code: "CN", name: t("chinaMyth"), subtitle: "Chinese Xianxia", Icon: Globe },
    { code: "JP", name: t("japanRpg"), subtitle: "Japanese RPG", Icon: Castle },
    { code: null, name: t("westernFantasy"), subtitle: "Western Fantasy", Icon: Swords },
    { code: null, name: t("buddhist"), subtitle: "Buddhism", Icon: Hand },
    { code: null, name: t("arabic"), subtitle: "Arabic", Icon: Building2 },
    { code: null, name: t("pokemon"), subtitle: "Pokémon", Icon: CircleDot },
    { code: null, name: t("marvel"), subtitle: "Marvel", Icon: Flame },
    { code: null, name: t("genshin"), subtitle: "Genshin Impact", Icon: Sparkles },
  ];

  const stats = [
    { value: "8+", label: t("statCultureSystems") },
    { value: "12", label: t("statHourlyFortune") },
    { value: "5", label: t("statDimensions") },
    { value: "AI", label: t("statAiReading") },
  ];

  return (
    <CosmicBackground>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <nav className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700">
              <Star className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white">宇宙命理</span>
              <span className="text-xs text-purple-300/70">Cosmic Destiny</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            {!isLoading && (
              isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="icon" variant="default" className="rounded-full" data-testid="button-user-avatar">
                    {user?.profileImageUrl ? (
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.profileImageUrl} />
                        <AvatarFallback className="bg-purple-600 text-white">
                          {user.firstName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="text-white text-sm">{user?.firstName?.[0] || "U"}</span>
                    )}
                  </Button>
                </Link>
              ) : (
                <a href="/api/login">
                  <Button size="icon" variant="default" className="rounded-full" data-testid="button-login">
                    <User className="h-5 w-5" />
                  </Button>
                </a>
              )
            )}
          </div>
        </nav>
      </header>

      <main>
        <section className="flex min-h-screen items-center justify-center px-4 pt-16">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Badge 
                variant="outline" 
                className="mb-8 border-purple-500/40 bg-purple-500/10 text-purple-200"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Cosmic Destiny™ Protocol v3.0
              </Badge>
              
              <h1 className="mb-2 text-5xl font-bold text-white md:text-6xl lg:text-7xl">
                宇宙命理
              </h1>
              <h2 className="mb-6 bg-gradient-to-r from-purple-400 via-purple-300 to-purple-400 bg-clip-text text-4xl font-bold text-transparent md:text-5xl lg:text-6xl">
                Cosmic Destiny
              </h2>
              
              <p className="mb-2 text-xl text-white/90 md:text-2xl">
                {t("landingHeroSubtitle")}
              </p>
              <p className="mb-10 text-base text-purple-200/70 md:text-lg">
                {t("landingHeroDesc")}
              </p>
              
              <div className="mb-16 flex flex-wrap items-center justify-center gap-4">
                {!isLoading && (
                  isAuthenticated ? (
                    <Link href="/dashboard">
                      <Button 
                        size="lg" 
                        className="gap-2 rounded-full bg-white text-purple-900" 
                        data-testid="button-get-started"
                      >
                        {t("getStartedNow")}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <a href="/api/login">
                      <Button 
                        size="lg" 
                        className="gap-2 rounded-full bg-white text-purple-900" 
                        data-testid="button-get-started-login"
                      >
                        {t("getStartedNow")}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </a>
                  )
                )}
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="rounded-full border-purple-400/40 text-purple-200"
                  data-testid="button-learn-more"
                >
                  {t("learnMore")}
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-3xl font-bold text-white md:text-4xl">{stat.value}</div>
                    <div className="text-sm text-purple-200/70">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-4 py-24">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 text-center"
            >
              <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
                {t("coreFeatures")}
              </h2>
              <p className="text-purple-200/70">
                {t("coreFeaturesDesc")}
              </p>
            </motion.div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {coreFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full border-purple-500/20 bg-white/5 backdrop-blur-sm hover-elevate">
                    <CardContent className="p-6">
                      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}>
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="mb-1 text-lg font-semibold text-white">{feature.title}</h3>
                      <p className="mb-3 text-sm text-purple-300/60">{feature.subtitle}</p>
                      <p className="text-sm text-purple-200/70">{feature.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-24">
          <div className="container mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <Badge className="mb-6 bg-purple-600/20 text-purple-300">
                  Protocol v3.0
                </Badge>
                <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
                  {t("protocolTitle")}
                </h2>
                <p className="mb-8 text-purple-200/70 leading-relaxed">
                  {t("protocolDesc")}
                </p>
                <Button 
                  variant="outline" 
                  className="rounded-full border-purple-400/40 text-purple-200"
                  data-testid="button-protocol-details"
                >
                  {t("protocolDetails")}
                </Button>
              </motion.div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {protocolFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card className="h-full border-purple-500/20 bg-white/5 backdrop-blur-sm">
                      <CardContent className="p-5">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
                          <feature.icon className="h-5 w-5 text-purple-400" />
                        </div>
                        <h3 className="mb-2 font-semibold text-white">{feature.title}</h3>
                        <p className="text-sm text-purple-200/60">{feature.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-24">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 text-center"
            >
              <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
                {t("cultureSystems8")}
              </h2>
              <p className="text-purple-200/70">
                {t("cultureSystems8Desc")}
              </p>
            </motion.div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cultureSystems.map((culture, index) => (
                <motion.div
                  key={culture.subtitle}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-purple-500/20 bg-white/5 backdrop-blur-sm hover-elevate cursor-pointer">
                    <CardContent className="flex flex-col items-center p-6 text-center">
                      {culture.code ? (
                        <span className="mb-3 text-2xl font-bold text-white">{culture.code}</span>
                      ) : (
                        <culture.Icon className="mb-3 h-8 w-8 text-purple-300" />
                      )}
                      <h3 className="mb-1 font-semibold text-purple-300">{culture.name}</h3>
                      <p className="text-sm text-purple-200/50">{culture.subtitle}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-24">
          <div className="container mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 text-center"
            >
              <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
                {t("founder")}
              </h2>
              <p className="text-purple-200/70">
                {t("founderDesc")}
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="border-purple-500/20 bg-white/5 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center gap-6 p-8 md:flex-row md:items-start">
                  <div className="relative">
                    <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-purple-500/30 bg-gradient-to-br from-purple-900 to-indigo-900">
                      <Star className="h-12 w-12 text-amber-400" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="mb-1 text-2xl font-bold text-white">{t("founderName")}</h3>
                    <p className="mb-4 text-purple-400">Mark Meng</p>
                    
                    <div className="mb-4 flex flex-wrap justify-center gap-2 md:justify-start">
                      <Badge variant="outline" className="border-purple-400/30 text-purple-200">
                        {t("founderBadge1")}
                      </Badge>
                      <Badge variant="outline" className="border-purple-400/30 text-purple-200">
                        {t("founderBadge2")}
                      </Badge>
                      <Badge variant="outline" className="border-purple-400/30 text-purple-200">
                        {t("founderBadge3")}
                      </Badge>
                      <Badge variant="outline" className="border-purple-400/30 text-purple-200">
                        {t("founderBadge4")}
                      </Badge>
                    </div>
                    
                    <p className="mb-6 text-purple-200/70">
                      {t("founderBio")}
                    </p>
                    
                    <div className="flex justify-center gap-3 md:justify-start">
                      <Button size="icon" variant="outline" className="rounded-full border-purple-400/30">
                        <Twitter className="h-4 w-4 text-purple-300" />
                      </Button>
                      <Button size="icon" variant="outline" className="rounded-full border-purple-400/30">
                        <Github className="h-4 w-4 text-purple-300" />
                      </Button>
                      <Button size="icon" variant="outline" className="rounded-full border-purple-400/30">
                        <Linkedin className="h-4 w-4 text-purple-300" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        <section className="px-4 py-24">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="mb-8 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
                  <Star className="h-10 w-10 text-white" />
                </div>
              </div>
              
              <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
                {t("startJourney")}
              </h2>
              <p className="mx-auto mb-10 max-w-2xl text-purple-200/70">
                {t("startJourneyDesc")}
              </p>
              
              <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
                {!isLoading && !isAuthenticated && (
                  <a href="/api/login">
                    <Button 
                      size="lg" 
                      className="gap-2 rounded-full bg-white text-purple-900"
                      data-testid="button-cta-start"
                    >
                      {t("freeStart")}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {isAuthenticated && (
                  <Link href="/dashboard">
                    <Button 
                      size="lg" 
                      className="gap-2 rounded-full bg-white text-purple-900"
                      data-testid="button-cta-dashboard"
                    >
                      {t("enterDashboard")}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-16">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700">
                  <Star className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <span className="text-lg font-bold text-white">宇宙命理</span>
                  <p className="text-xs text-purple-300/70">Cosmic Destiny</p>
                </div>
              </div>
              <p className="text-sm text-purple-200/60 leading-relaxed">
                {t("footerDesc")}
              </p>
            </div>
            
            <div>
              <h3 className="mb-4 font-semibold text-white">{t("products")}</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-purple-200/60 hover:text-purple-200">{t("dailyFortune")}</a></li>
                <li><a href="#" className="text-purple-200/60 hover:text-purple-200">{t("baziReading")}</a></li>
                <li><a href="#" className="text-purple-200/60 hover:text-purple-200">{t("terminal")}</a></li>
                <li><a href="#" className="text-purple-200/60 hover:text-purple-200">{t("culturalSystems")}</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="mb-4 font-semibold text-white">{t("support")}</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-purple-200/60 hover:text-purple-200">{t("helpCenter")}</a></li>
                <li><a href="#" className="text-purple-200/60 hover:text-purple-200">{t("contactUs")}</a></li>
                <li><a href="#" className="text-purple-200/60 hover:text-purple-200">{t("privacyPolicy")}</a></li>
                <li><a href="#" className="text-purple-200/60 hover:text-purple-200">{t("termsOfService")}</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-purple-200/50">
            © 2024 Cosmic Destiny. {t("allRightsReserved")}. Powered by AI.
          </div>
        </div>
      </footer>
    </CosmicBackground>
  );
}
