# 🌌 宇宙命理 · Cosmic Destiny

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Web%20%7C%20Android%20%7C%20iOS-6B21A8?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/AI-Kimi%20%28Moonshot%29-A855F7?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql" />
</p>

---

## 简介（中文）

- **宇宙命理**-  是一款基于「宇宙命理™协议 v3.0」的全球化、AI 驱动的占星与命理平台。
- **体验网址**-  https://aicosmicdestiny.com/

### ✨ 核心功能

- **八字命盘（BaZi）** — 生成完整的四柱八字，包含天干地支、十神、大运、流年分析
- **AI 每日运势** — 由 Kimi（Moonshot AI）驱动的个性化运势解读，支持事业、感情、财运、健康四维度
- **AI 神机妙算** — 自由提问，AI 给出深度占卜回答
- **配对匹配** — 基于命理学的合婚/合伙分析
- **8 大文化体系** — 中华、日系、西方、佛教、阿拉伯、宝可梦、漫威、原神（璃月）风格切换
- **星尘积分系统** — 每日签到、邀请好友获得积分，兑换 AI 查询次数
- **管理后台** — 实时用户统计、注册趋势、访客分析图表

### 🌐 多语言支持

中文 · English · 日本語 · 한국어

### 💳 订阅计划

| 计划 | 每月星尘 | AI 模型 |
|------|---------|---------|
| 免费版 | 200（注册赠送）| kimi-k2-thinking |
| Pro 版 | 1200 | kimi-k2.5 |
| Elite 版 | 4000 | kimi-k2.5 |

### 📱 多端支持

- **Web 端**：直接访问，响应式设计
- **Android**：基于 Capacitor 7.x 打包，可生成 APK
- **iOS**：基于 Capacitor 7.x 打包，可生成 IPA

---

## Introduction (English)

**Cosmic Destiny** is a globalized, AI-powered fortune-telling and astrology platform based on the Cosmic Destiny™ Protocol v3.0.

### ✨ Core Features

- **BaZi (八字) Chart Reading** — Full Four Pillars analysis with Heavenly Stems, Earthly Branches, Ten Gods, Grand Luck Periods, and Yearly Fortune projections
- **AI Daily Fortune** — Personalized fortune readings powered by Kimi (Moonshot AI) across career, love, wealth, and health dimensions
- **AI Divination** — Free-form questions with deep AI-powered answers
- **Compatibility Matching** — Astrology-based relationship and partnership analysis
- **8 Cultural Systems** — Chinese, Japanese RPG, Western Fantasy, Buddhist, Arabic, Pokémon, Marvel, and Genshin (Liyue) style themes
- **Stardust Points System** — Daily check-ins and referrals earn points redeemable for AI queries
- **Admin Analytics Dashboard** — Real-time user stats, registration trends, and visitor analytics

### 🌐 Language Support

Chinese · English · Japanese · Korean

### 💳 Subscription Plans

| Plan | Monthly Stardust | AI Model |
|------|-----------------|---------|
| Free | 200 (sign-up gift) | kimi-k2-thinking |
| Pro | 1,200 | kimi-k2.5 |
| Elite | 4,000 | kimi-k2.5 |

### 📱 Platform Support

- **Web**: Direct browser access, fully responsive
- **Android**: Capacitor 7.x wrapper, APK-ready
- **iOS**: Capacitor 7.x wrapper, IPA-ready

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Express.js |
| Database | PostgreSQL + Drizzle ORM |
| UI | shadcn/ui + Tailwind CSS + Framer Motion |
| AI | Kimi (Moonshot AI) — `kimi-k2-thinking` / `kimi-k2.5` |
| Auth | Replit Auth (OpenID Connect) |
| Payment | PayPal Advanced Checkout |
| Mobile | Capacitor 7.x (Android + iOS) |
| Analytics | TikTok Events API (server-side postback) |
| i18n | Custom i18n system (zh / en / ja / ko) |

---

## Build & Deploy

### Web

```bash
npm install
npm run dev       # Development
npm run build     # Production build
```

### Android APK

1. Run `npm run build` to build web assets
2. Run `npx cap sync android` to sync to native
3. Open `android/` in Android Studio
4. Build > Generate Signed Bundle / APK

### iOS IPA

1. Run `npm run build` and `npx cap sync ios`
2. On macOS: `cd ios/App && pod install`
3. Open `ios/App/App.xcworkspace` in Xcode
4. Set signing team → Product > Archive > Distribute App

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session secret |
| `KIMI_API_KEY` | Moonshot AI API key |
| `OPENAI_API_KEY` | OpenAI API key (for embeddings) |
| `PAYPAL_CLIENT_ID` | PayPal client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal client secret |
| `TIKTOK_ACCESS_TOKEN` | TikTok Events API token |

---

## License

© 2025 Cosmic Destiny. All rights reserved.
