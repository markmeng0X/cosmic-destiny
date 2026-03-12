import OpenAI from "openai";
import type { BaziResult } from "./bazi-calculator";
import { buildRAGContext, getRAGSystemPrompt } from "./knowledge-service";

// Kimi API client (Moonshot AI)
const kimi = new OpenAI({
  apiKey: process.env.KIMI_API_KEY,
  baseURL: "https://api.moonshot.cn/v1",
});

// Model selection based on subscription tier
// Free users: kimi-k2-thinking
// Paid users (pro/elite): kimi-k2.5
export function getKimiModel(subscriptionTier?: string): string {
  if (subscriptionTier === "pro" || subscriptionTier === "elite") {
    return "kimi-k2.5";
  }
  return "kimi-k2-thinking";
}

// Fast translation model for quick language switching
const FAST_TRANSLATION_MODEL = "moonshot-v1-8k";

// Target character length for AI interpretations
const TARGET_INTERPRETATION_LENGTH = { min: 200, max: 300 };

// Enforce interpretation length (200-300 characters)
function enforceInterpretationLength(text: string): string {
  if (!text) return text;
  // If text is too long, truncate intelligently at sentence boundary
  if (text.length > TARGET_INTERPRETATION_LENGTH.max) {
    // Find last sentence break before max length
    const truncated = text.slice(0, TARGET_INTERPRETATION_LENGTH.max);
    const lastPeriod = Math.max(
      truncated.lastIndexOf("。"),
      truncated.lastIndexOf("."),
      truncated.lastIndexOf("！"),
      truncated.lastIndexOf("!"),
      truncated.lastIndexOf("？"),
      truncated.lastIndexOf("?")
    );
    if (lastPeriod > TARGET_INTERPRETATION_LENGTH.min) {
      return truncated.slice(0, lastPeriod + 1);
    }
    return truncated + "...";
  }
  return text;
}

// Language-specific instructions for AI prompts
const languageInstructions: Record<string, string> = {
  zh: "请用中文回复。",
  en: "Please respond in English.",
  ja: "日本語で回答してください。",
  ko: "한국어로 응답해 주세요.",
};

// Language-specific dimension descriptions
const dimensionDescsI18n: Record<string, Record<string, string[]>> = {
  zh: {
    career: [
      "工作上会有贵人相助，把握机会展现能力。",
      "职场运势平稳，适合巩固现有成果。",
      "可能遇到挑战，保持耐心和专注。",
    ],
    love: [
      "感情运势向好，单身者有机会遇到心仪对象。",
      "感情运势平稳，适合增进彼此了解。",
      "可能有小摩擦，需要多一些包容和理解。",
    ],
    wealth: [
      "财运不错，可能有意外收入。",
      "财运平稳，适合稳健理财。",
      "注意节制开支，避免冲动消费。",
    ],
    health: [
      "身体状况良好，精力充沛。",
      "注意作息规律，适当运动。",
      "注意保暖防寒，避免过度劳累。",
    ],
    study: [
      "学习效率高，是吸收新知识的好时机。",
      "思维清晰，适合深入研究。",
      "可能有些分心，需要集中注意力。",
    ],
  },
  en: {
    career: [
      "Helpful people will support your work. Seize opportunities to showcase your abilities.",
      "Career fortune is stable. Good time to consolidate current achievements.",
      "May encounter challenges. Stay patient and focused.",
    ],
    love: [
      "Love fortune is improving. Singles may meet someone special.",
      "Relationship fortune is stable. Good time to deepen understanding.",
      "Minor friction possible. More tolerance and understanding needed.",
    ],
    wealth: [
      "Good fortune with finances. Unexpected income possible.",
      "Financial fortune is stable. Suitable for conservative investing.",
      "Watch your spending. Avoid impulsive purchases.",
    ],
    health: [
      "Physical condition is excellent. Full of energy.",
      "Maintain regular schedule. Exercise appropriately.",
      "Stay warm and avoid overexertion.",
    ],
    study: [
      "Learning efficiency is high. Great time to absorb new knowledge.",
      "Clear thinking. Good for in-depth research.",
      "May be distracted. Need to focus attention.",
    ],
  },
  ja: {
    career: [
      "仕事では助けてくれる人が現れます。能力を発揮するチャンスを掴みましょう。",
      "キャリア運は安定しています。現在の成果を固める良い時期です。",
      "困難に遭遇するかもしれません。忍耐と集中を保ちましょう。",
    ],
    love: [
      "恋愛運が向上しています。独身の方は素敵な出会いがあるかも。",
      "恋愛運は安定しています。互いの理解を深める良い時期です。",
      "小さな摩擦があるかもしれません。より多くの寛容と理解が必要です。",
    ],
    wealth: [
      "金運が良好です。思わぬ収入があるかもしれません。",
      "金運は安定しています。堅実な資産運用に向いています。",
      "支出に注意しましょう。衝動買いは避けてください。",
    ],
    health: [
      "体調は良好です。活力に満ちています。",
      "規則正しい生活を心がけ、適度な運動をしましょう。",
      "温かくして、過労を避けてください。",
    ],
    study: [
      "学習効率が高いです。新しい知識を吸収する絶好の機会です。",
      "思考がクリアです。深い研究に適しています。",
      "集中力が散漫になりがちです。注意を集中させましょう。",
    ],
  },
  ko: {
    career: [
      "직장에서 도움을 주는 사람이 나타날 것입니다. 능력을 발휘할 기회를 잡으세요.",
      "직장 운이 안정적입니다. 현재 성과를 공고히 할 좋은 시기입니다.",
      "도전에 직면할 수 있습니다. 인내심과 집중력을 유지하세요.",
    ],
    love: [
      "연애 운이 좋아지고 있습니다. 싱글은 좋은 만남이 있을 수 있습니다.",
      "연애 운이 안정적입니다. 서로에 대한 이해를 깊게 할 좋은 시기입니다.",
      "작은 마찰이 있을 수 있습니다. 더 많은 포용과 이해가 필요합니다.",
    ],
    wealth: [
      "재물 운이 좋습니다. 예상치 못한 수입이 있을 수 있습니다.",
      "재물 운이 안정적입니다. 안정적인 재테크에 적합합니다.",
      "지출을 절제하세요. 충동 소비를 피하세요.",
    ],
    health: [
      "건강 상태가 좋습니다. 에너지가 넘칩니다.",
      "규칙적인 생활을 유지하고 적절한 운동을 하세요.",
      "따뜻하게 지내고 과로를 피하세요.",
    ],
    study: [
      "학습 효율이 높습니다. 새로운 지식을 습득하기 좋은 시기입니다.",
      "사고가 명확합니다. 심도 있는 연구에 적합합니다.",
      "집중력이 흐트러질 수 있습니다. 주의를 집중해야 합니다.",
    ],
  },
};

// Language-specific hourly fortune labels
const hourlyLabelsI18n: Record<string, { favorable: string[]; unfavorable: string[] }> = {
  zh: {
    favorable: ["创作", "签约", "休息", "谈判", "投资", "学习", "社交", "运动", "沟通", "策划", "约会", "出行", "理财", "冥想", "阅读", "开会"],
    unfavorable: ["冲动决策", "远行", "大额消费", "争执", "冒险", "签订合同", "高风险投资", "剧烈运动", "熬夜", "借贷", "口舌是非", "重大决定"],
  },
  en: {
    favorable: ["Creating", "Signing", "Resting", "Negotiating", "Investing", "Learning", "Socializing", "Exercising", "Communicating", "Planning", "Dating", "Traveling", "Finance", "Meditating", "Reading", "Meeting"],
    unfavorable: ["Impulsive decisions", "Long trips", "Big purchases", "Arguments", "Risk-taking", "Contracts", "High-risk investing", "Intense exercise", "Staying up late", "Borrowing", "Gossip", "Major decisions"],
  },
  ja: {
    favorable: ["創作", "契約", "休息", "交渉", "投資", "学習", "社交", "運動", "コミュニケーション", "企画", "デート", "外出", "資産管理", "瞑想", "読書", "会議"],
    unfavorable: ["衝動的な決断", "遠出", "高額消費", "口論", "冒険", "契約締結", "ハイリスク投資", "激しい運動", "夜更かし", "借金", "口論", "重大な決定"],
  },
  ko: {
    favorable: ["창작", "계약", "휴식", "협상", "투자", "학습", "사교", "운동", "소통", "기획", "데이트", "여행", "재테크", "명상", "독서", "회의"],
    unfavorable: ["충동적 결정", "장거리 여행", "고액 소비", "다툼", "모험", "계약 체결", "고위험 투자", "격렬한 운동", "밤샘", "대출", "구설수", "중대한 결정"],
  },
};

interface DimensionFortune {
  score: number;
  desc: string;
}

interface FortuneInsight {
  text: string;
  type: "favorable" | "caution" | "advice";
}

interface DailyFortuneResult {
  overallScore: number;
  career: DimensionFortune;
  love: DimensionFortune;
  wealth: DimensionFortune;
  health: DimensionFortune;
  study: DimensionFortune;
  hourlyFortunes: Array<{ hour: string; score: number; favorable: string; unfavorable: string }>;
  recommendations: string[];
  aiInterpretation: string;
  insights: FortuneInsight[];
}

interface HourlyFortune {
  hour: string;
  score: number;
  favorable: string;
  unfavorable: string;
}

const HOUR_BRANCHES = [
  { branch: "子时", time: "23:00-01:00" },
  { branch: "丑时", time: "01:00-03:00" },
  { branch: "寅时", time: "03:00-05:00" },
  { branch: "卯时", time: "05:00-07:00" },
  { branch: "辰时", time: "07:00-09:00" },
  { branch: "巳时", time: "09:00-11:00" },
  { branch: "午时", time: "11:00-13:00" },
  { branch: "未时", time: "13:00-15:00" },
  { branch: "申时", time: "15:00-17:00" },
  { branch: "酉时", time: "17:00-19:00" },
  { branch: "戌时", time: "19:00-21:00" },
  { branch: "亥时", time: "21:00-23:00" },
];

function generateBaseScores(baziResult: BaziResult, date: Date): Record<string, number> {
  const seed = date.getDate() + date.getMonth() * 31 + baziResult.bodyStrength * 100;
  const rand = (offset: number) => ((seed + offset) * 9301 + 49297) % 233280 / 233280;
  
  const bodyMod = baziResult.bodyStrength > 5 ? 5 : -5;
  
  return {
    career: Math.floor(50 + rand(1) * 40 + bodyMod),
    love: Math.floor(50 + rand(2) * 40 + (baziResult.tenGods["正财"] || 0) * 5),
    wealth: Math.floor(50 + rand(3) * 40 + (baziResult.tenGods["偏财"] || 0) * 5),
    health: Math.floor(50 + rand(4) * 40 + (baziResult.fiveElements["水"] || 0) * 3),
    study: Math.floor(50 + rand(5) * 40 + (baziResult.tenGods["正印"] || 0) * 5),
  };
}

function generateHourlyFortunes(baseScores: Record<string, number>, date: Date, language: string = "zh"): HourlyFortune[] {
  const seed = date.getDate();
  const hourlyFortunes: HourlyFortune[] = [];
  
  const langLabels = hourlyLabelsI18n[language] || hourlyLabelsI18n.zh;
  const favorableActivities = langLabels.favorable;
  const unfavorableActivities = langLabels.unfavorable;
  
  HOUR_BRANCHES.forEach((hour, index) => {
    const variation = ((seed + index) * 17) % 30 - 15;
    const avgScore = Object.values(baseScores).reduce((a, b) => a + b, 0) / 5;
    const score = Math.max(20, Math.min(100, Math.floor(avgScore + variation)));
    
    const favIdx1 = (seed + index) % favorableActivities.length;
    const unfavIdx1 = (seed + index * 3) % unfavorableActivities.length;
    
    hourlyFortunes.push({
      hour: hour.branch,
      score,
      favorable: favorableActivities[favIdx1],
      unfavorable: unfavorableActivities[unfavIdx1],
    });
  });
  
  return hourlyFortunes;
}

export async function generateDailyFortune(
  baziResult: BaziResult,
  date: Date,
  culture: string = "china",
  language: string = "zh"
): Promise<DailyFortuneResult> {
  const baseScores = generateBaseScores(baziResult, date);
  const hourlyFortunes = generateHourlyFortunes(baseScores, date, language);
  
  const overallScore = Math.floor(
    Object.values(baseScores).reduce((a, b) => a + b, 0) / 5
  );
  
  const dimensionDescs = dimensionDescsI18n[language] || dimensionDescsI18n.zh;
  
  const getDesc = (dimension: string, score: number): string => {
    const descs = dimensionDescs[dimension];
    if (score >= 70) return descs[0];
    if (score >= 50) return descs[1];
    return descs[2];
  };
  
  // Language-specific default interpretations
  const defaultInterpretations: Record<string, { good: string; medium: string; bad: string }> = {
    zh: { good: "今日整体运势向好。", medium: "今日整体运势平稳。", bad: "今日整体运势需谨慎。" },
    en: { good: "Today's overall fortune is favorable.", medium: "Today's overall fortune is stable.", bad: "Today requires caution." },
    ja: { good: "今日の運勢は良好です。", medium: "今日の運勢は安定しています。", bad: "今日は慎重に。" },
    ko: { good: "오늘의 전체 운세가 좋습니다.", medium: "오늘의 전체 운세가 안정적입니다.", bad: "오늘은 신중해야 합니다." },
  };
  const langDefault = defaultInterpretations[language] || defaultInterpretations.zh;
  let aiInterpretation = overallScore >= 70 ? langDefault.good : overallScore >= 50 ? langDefault.medium : langDefault.bad;
  
  const langInstruction = languageInstructions[language] || languageInstructions.zh;
  
  try {
    const ragContext = await buildRAGContext(
      `日运分析 ${baziResult.destinyPattern}`,
      { dayStem: baziResult.dayStem, favorableGods: baziResult.favorableGod ? [baziResult.favorableGod] : [] }
    );
    
    const cultureStyle: Record<string, Record<string, string>> = {
      zh: { china: "中国传统命理", japan: "日式RPG", default: "现代通俗" },
      en: { china: "traditional Chinese astrology", japan: "Japanese RPG style", default: "accessible modern" },
      ja: { china: "中国伝統命理", japan: "日本RPG風", default: "現代的で分かりやすい" },
      ko: { china: "중국 전통 명리", japan: "일본 RPG 스타일", default: "현대적이고 이해하기 쉬운" },
    };
    const langCultureStyle = cultureStyle[language] || cultureStyle.zh;
    const selectedCultureStyle = langCultureStyle[culture] || langCultureStyle.default;
    
    const userRequestTemplates: Record<string, string> = {
      zh: `根据以下八字信息和今日日期，提供详细的运势分析（150-250字）：
    
【八字信息】
日主：${baziResult.dayStem}（${baziResult.dayMasterElement || ""}${baziResult.dayMasterPolarity || ""}）
身强身弱：${baziResult.bodyStrengthLevel}
命格：${baziResult.destinyPattern}
喜用神：${baziResult.favorableGod || ""}
忌神：${baziResult.avoidGod || ""}

【今日日期】：${date.toLocaleDateString("zh-CN")}

【五维运势评分】
事业 ${baseScores.career}分，爱情 ${baseScores.love}分，财运 ${baseScores.wealth}分，健康 ${baseScores.health}分，学业 ${baseScores.study}分

请从以下几个方面进行详细解读：
1. 今日整体运势走向和能量特点
2. 需要特别注意的事项和建议
3. 宜做和忌做的具体事宜
4. 有利时辰和方位指引

使用${selectedCultureStyle}风格，语言要生动有洞察力。`,
      en: `Based on the following BaZi information and today's date, provide a detailed fortune analysis (150-250 words):

【BaZi Information】
Day Master: ${baziResult.dayStem} (${baziResult.dayMasterElement || ""} ${baziResult.dayMasterPolarity || ""})
Body Strength: ${baziResult.bodyStrengthLevel}
Destiny Pattern: ${baziResult.destinyPattern}
Favorable Elements: ${baziResult.favorableGod || ""}
Unfavorable Elements: ${baziResult.avoidGod || ""}

【Today's Date】: ${date.toLocaleDateString("en-US")}

【Five Dimension Scores】
Career ${baseScores.career}, Love ${baseScores.love}, Wealth ${baseScores.wealth}, Health ${baseScores.health}, Study ${baseScores.study}

Please provide insights on:
1. Overall fortune trend and energy characteristics today
2. Important matters to pay attention to
3. Specific activities that are favorable and unfavorable
4. Auspicious hours and directions

Use ${selectedCultureStyle} language style, be insightful and engaging.`,
      ja: `以下の八字情報と本日の日付に基づいて、詳細な運勢分析（150〜250字）を提供してください：

【八字情報】
日主：${baziResult.dayStem}（${baziResult.dayMasterElement || ""}${baziResult.dayMasterPolarity || ""}）
身強身弱：${baziResult.bodyStrengthLevel}
命格：${baziResult.destinyPattern}
喜用神：${baziResult.favorableGod || ""}
忌神：${baziResult.avoidGod || ""}

【本日の日付】：${date.toLocaleDateString("ja-JP")}

【五次元運勢スコア】
キャリア ${baseScores.career}点、恋愛 ${baseScores.love}点、財運 ${baseScores.wealth}点、健康 ${baseScores.health}点、学業 ${baseScores.study}点

以下の観点から詳しく解説してください：
1. 今日の全体的な運勢の流れとエネルギーの特徴
2. 特に注意すべき事項とアドバイス
3. 吉凶に関する具体的な行動指針
4. 吉時と吉方位のガイダンス

${selectedCultureStyle}スタイルで、洞察力のある生き生きとした文章で。`,
      ko: `다음 사주 정보와 오늘 날짜를 기반으로 상세한 운세 분석(150-250자)을 제공해 주세요:

【사주 정보】
일주：${baziResult.dayStem}（${baziResult.dayMasterElement || ""}${baziResult.dayMasterPolarity || ""}）
신강신약：${baziResult.bodyStrengthLevel}
명격：${baziResult.destinyPattern}
희용신：${baziResult.favorableGod || ""}
기신：${baziResult.avoidGod || ""}

【오늘 날짜】：${date.toLocaleDateString("ko-KR")}

【5차원 운세 점수】
커리어 ${baseScores.career}점, 연애 ${baseScores.love}점, 재물 ${baseScores.wealth}점, 건강 ${baseScores.health}점, 학업 ${baseScores.study}점

다음 관점에서 자세히 해석해 주세요：
1. 오늘의 전체 운세 흐름과 에너지 특성
2. 특히 주의해야 할 사항과 조언
3. 길흉에 관한 구체적인 행동 지침
4. 길한 시간과 방위 안내

${selectedCultureStyle} 스타일로 통찰력 있고 생동감 있는 문장으로.`,
    };
    
    const userRequest = userRequestTemplates[language] || userRequestTemplates.zh;

    const defaultSystemPrompts: Record<string, string> = {
      zh: "你是一位专业的命理大师。",
      en: "You are a professional astrology master.",
      ja: "あなたは専門的な命理師です。",
      ko: "당신은 전문 명리사입니다.",
    };
    
    const systemPrompt = ragContext 
      ? `${getRAGSystemPrompt(language)}\n\n【命理协议】:\n${ragContext}`
      : defaultSystemPrompts[language] || defaultSystemPrompts.zh;

    const completion = await kimi.chat.completions.create({
      model: getKimiModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userRequest }
      ],
      max_tokens: 500,
    });
    
    aiInterpretation = completion.choices[0]?.message?.content || aiInterpretation;
  } catch (error) {
    console.error("AI interpretation error:", error);
  }
  
  // Language-specific insights
  const insightsI18n: Record<string, { 
    adviceGood: string; cautionBad: string;
    wealthGood: string; wealthBad: string;
    healthBad: string; healthGood: string;
  }> = {
    zh: {
      adviceGood: "今日宜静心思考，不宜冲动行事",
      cautionBad: "今日需谨慎行事，避免重大决策",
      wealthGood: "财运较旺，可适当把握投资机会",
      wealthBad: "财运平平，避免大额消费",
      healthBad: "注意休息，避免过度劳累",
      healthGood: "精力充沛，适合户外活动",
    },
    en: {
      adviceGood: "Good day for thoughtful reflection, avoid impulsive actions",
      cautionBad: "Be cautious today, avoid major decisions",
      wealthGood: "Good wealth fortune, consider investment opportunities",
      wealthBad: "Average wealth fortune, avoid large purchases",
      healthBad: "Rest well, avoid overexertion",
      healthGood: "Full of energy, good for outdoor activities",
    },
    ja: {
      adviceGood: "今日は静かに考える日、衝動的な行動は避けて",
      cautionBad: "今日は慎重に、重大な決定は避けて",
      wealthGood: "金運が良好、投資のチャンスを掴んで",
      wealthBad: "金運は普通、高額な買い物は控えて",
      healthBad: "休息を取り、過労を避けて",
      healthGood: "エネルギー充実、アウトドア活動に最適",
    },
    ko: {
      adviceGood: "오늘은 차분하게 생각할 좋은 날, 충동적 행동은 피하세요",
      cautionBad: "오늘은 신중하게, 중대한 결정은 피하세요",
      wealthGood: "재물 운이 좋습니다, 투자 기회를 잡으세요",
      wealthBad: "재물 운이 평범합니다, 큰 지출은 피하세요",
      healthBad: "충분한 휴식을 취하고 과로를 피하세요",
      healthGood: "에너지가 넘칩니다, 야외 활동에 좋습니다",
    },
  };
  const langInsights = insightsI18n[language] || insightsI18n.zh;
  
  const insights: FortuneInsight[] = [];
  
  if (overallScore >= 70) {
    insights.push({ text: langInsights.adviceGood, type: "advice" });
  } else {
    insights.push({ text: langInsights.cautionBad, type: "caution" });
  }
  
  if (baseScores.wealth >= 70) {
    insights.push({ text: langInsights.wealthGood, type: "favorable" });
  } else if (baseScores.wealth < 50) {
    insights.push({ text: langInsights.wealthBad, type: "caution" });
  }
  
  if (baseScores.health < 60) {
    insights.push({ text: langInsights.healthBad, type: "caution" });
  } else {
    insights.push({ text: langInsights.healthGood, type: "favorable" });
  }
  
  // Language-specific recommendations
  const recsI18n: Record<string, { 
    overallGood: string; overallBad: string;
    healthBad: string; healthGood: string;
    wealthGood: string; wealthBad: string;
  }> = {
    zh: {
      overallGood: "把握机遇，积极行动",
      overallBad: "稳中求进，谨慎决策",
      healthBad: "注意休息，保持健康",
      healthGood: "适当运动，增强体质",
      wealthGood: "财运佳，可考虑投资",
      wealthBad: "理性消费，稳健理财",
    },
    en: {
      overallGood: "Seize opportunities, take action",
      overallBad: "Stay steady, make careful decisions",
      healthBad: "Rest well, maintain health",
      healthGood: "Exercise moderately, strengthen body",
      wealthGood: "Good fortune, consider investing",
      wealthBad: "Spend wisely, manage finances carefully",
    },
    ja: {
      overallGood: "チャンスを掴み、積極的に行動",
      overallBad: "着実に進み、慎重に決断",
      healthBad: "休息を取り、健康を維持",
      healthGood: "適度な運動で体を強化",
      wealthGood: "運気良好、投資を検討",
      wealthBad: "賢く消費し、堅実に管理",
    },
    ko: {
      overallGood: "기회를 잡고 적극적으로 행동하세요",
      overallBad: "안정을 유지하며 신중하게 결정하세요",
      healthBad: "충분히 쉬고 건강을 유지하세요",
      healthGood: "적절한 운동으로 체력을 강화하세요",
      wealthGood: "운이 좋습니다, 투자를 고려하세요",
      wealthBad: "현명하게 소비하고 안정적으로 관리하세요",
    },
  };
  const langRecs = recsI18n[language] || recsI18n.zh;
  
  return {
    overallScore,
    career: { score: baseScores.career, desc: getDesc("career", baseScores.career) },
    love: { score: baseScores.love, desc: getDesc("love", baseScores.love) },
    wealth: { score: baseScores.wealth, desc: getDesc("wealth", baseScores.wealth) },
    health: { score: baseScores.health, desc: getDesc("health", baseScores.health) },
    study: { score: baseScores.study, desc: getDesc("study", baseScores.study) },
    hourlyFortunes,
    recommendations: [
      overallScore >= 70 ? langRecs.overallGood : langRecs.overallBad,
      baseScores.health < 60 ? langRecs.healthBad : langRecs.healthGood,
      baseScores.wealth >= 70 ? langRecs.wealthGood : langRecs.wealthBad,
    ],
    aiInterpretation,
    insights,
  };
}

export async function generateDivination(
  question: string,
  questionType: string,
  baziResult: BaziResult,
  culture: string = "china",
  divinationModel: string = "liuyao",
  language: string = "zh"
): Promise<{ result: string; keyPoints: string[]; advice: string }> {
  const culturePromptsI18n: Record<string, Record<string, string>> = {
    zh: {
      none: "你是一位精通命理占卜的大师，用专业客观的方式解读卦象。",
      china: "你是一位精通中国传统六爻占卜的命理大师，用洪荒神话的视角解读卦象。",
      japan: "你是一位日式RPG世界的智者，用冒险故事的方式解读命运指引。",
      western: "你是一位西方奇幻世界的魔法师，用魔法和预言的语言解读命运。",
      buddhist: "你是一位精通佛法的高僧，用因果轮回的智慧解读人生困惑。",
      arabic: "你是一位阿拉伯神话中的智慧精灵，用神秘的东方智慧解读命运。",
      pokemon: "你是一位资深的宝可梦训练家兼命理师，用宝可梦的智慧解读命运。",
      marvel: "你是漫威宇宙中的奇异博士，用多元宇宙的视角解读命运轨迹。",
      genshin: "你是提瓦特大陆的智者，用元素之力和命之座解读命运走向。",
    },
    en: {
      none: "You are a master of divination, interpreting hexagrams professionally and objectively.",
      china: "You are a Chinese divination master using ancient mythology perspectives.",
      japan: "You are a wise sage in a Japanese RPG world, delivering fate guidance through adventure.",
      western: "You are a wizard in a Western fantasy world, interpreting destiny through magic.",
      buddhist: "You are a Buddhist monk using karma and rebirth wisdom to guide life questions.",
      arabic: "You are a wise genie from Arabian mythology, using mystical Eastern wisdom.",
      pokemon: "You are a senior Pokemon trainer and fortune teller, using Pokemon wisdom.",
      marvel: "You are Doctor Strange from Marvel, interpreting fate through the multiverse.",
      genshin: "You are a Teyvat sage, interpreting destiny through elemental power and constellations.",
    },
    ja: {
      none: "あなたは占いの達人で、専門的かつ客観的に卦を解読します。",
      china: "あなたは中国の伝統的な易占の達人で、神話の視点から解読します。",
      japan: "あなたは日本のRPG世界の賢者で、冒険物語を通じて運命を導きます。",
      western: "あなたは西洋ファンタジー世界の魔法使いで、魔法で運命を解読します。",
      buddhist: "あなたは仏法に精通した高僧で、因果と輪廻の知恵で導きます。",
      arabic: "あなたはアラビア神話の知恵の精霊で、神秘の知恵で運命を解読します。",
      pokemon: "あなたはベテランのポケモントレーナー兼占い師です。",
      marvel: "あなたはマーベルのドクターストレンジで、マルチバースで運命を解読します。",
      genshin: "あなたはテイワットの賢者で、元素の力と命ノ星座で運命を解読します。",
    },
    ko: {
      none: "당신은 점술의 대가로, 전문적이고 객관적으로 괘를 해석합니다.",
      china: "당신은 중국 전통 점술의 대가로, 신화의 관점에서 해석합니다.",
      japan: "당신은 일본 RPG 세계의 현자로, 모험 이야기로 운명을 안내합니다.",
      western: "당신은 서양 판타지 세계의 마법사로, 마법으로 운명을 해석합니다.",
      buddhist: "당신은 불법에 정통한 고승으로, 인과와 윤회의 지혜로 안내합니다.",
      arabic: "당신은 아라비안 신화의 지혜로운 정령으로, 신비한 지혜로 운명을 해석합니다.",
      pokemon: "당신은 베테랑 포켓몬 트레이너이자 점술사입니다.",
      marvel: "당신은 마블의 닥터 스트레인지로, 멀티버스로 운명을 해석합니다.",
      genshin: "당신은 테이바트의 현자로, 원소의 힘과 운명의 자리로 운명을 해석합니다.",
    },
  };
  
  const langCulturePrompts = culturePromptsI18n[language] || culturePromptsI18n.zh;
  const langInstruction = languageInstructions[language] || languageInstructions.zh;

  const modelDescI18n: Record<string, { meihua: string; liuyao: string }> = {
    zh: { meihua: "梅花易数", liuyao: "六爻占卜" },
    en: { meihua: "Plum Blossom Numerology", liuyao: "Six Lines Divination" },
    ja: { meihua: "梅花易数", liuyao: "六爻占卜" },
    ko: { meihua: "매화역수", liuyao: "육효점" },
  };
  const modelDesc = (modelDescI18n[language] || modelDescI18n.zh)[divinationModel === "meihua" ? "meihua" : "liuyao"];
  
  const promptTemplateI18n: Record<string, string> = {
    zh: `${langCulturePrompts[culture] || langCulturePrompts.none}

你正在使用${modelDesc}方法进行占卜。

【用户信息】
- 问题：${question}
- 问题类型：${questionType}
- 命格：${baziResult.destinyPattern}
- 身强身弱：${baziResult.bodyStrengthLevel}
- 喜用神：${baziResult.favorableGod || ""}
- 忌神：${baziResult.avoidGod || ""}

请严格按以下格式回复，提供详细深入的占卜解读：

【卦象解读】（300-500字的卦象/预言解读，要详细分析卦象含义、当前形势、未来发展趋势、潜在机遇与风险，结合用户命格进行个性化解读）

【关键提示】提示1、提示2、提示3、提示4、提示5（五个关键提示，每个5-10字，用顿号分隔）

【行动建议】（150-200字的具体建议，包括短期行动、长期规划、需要注意的时机和方位、具体的化解或增运方法）`,
    en: `${langCulturePrompts[culture] || langCulturePrompts.none}

You are using the ${modelDesc} method for divination.

【User Information】
- Question: ${question}
- Question type: ${questionType}
- Destiny Pattern: ${baziResult.destinyPattern}
- Body Strength: ${baziResult.bodyStrengthLevel}
- Favorable God: ${baziResult.favorableGod || ""}
- Unfavorable God: ${baziResult.avoidGod || ""}

Please respond in this format with detailed, insightful divination:

【Hexagram Reading】(300-500 words analyzing hexagram meaning, current situation, future trends, potential opportunities and risks, personalized interpretation based on user's destiny)

【Key Points】Point1, Point2, Point3, Point4, Point5 (five key tips, 5-10 words each)

【Action Advice】(150-200 words of specific advice including short-term actions, long-term planning, timing and directions to note, specific remedies or fortune-enhancing methods)`,
    ja: `${langCulturePrompts[culture] || langCulturePrompts.none}

${modelDesc}の方法で占っています。

【ユーザー情報】
- 質問：${question}
- 質問タイプ：${questionType}
- 命格：${baziResult.destinyPattern}
- 身強身弱：${baziResult.bodyStrengthLevel}
- 喜用神：${baziResult.favorableGod || ""}
- 忌神：${baziResult.avoidGod || ""}

以下の形式で詳細かつ洞察力のある占い解読を提供してください：

【卦象解読】（300-500字で卦象の意味、現状、将来のトレンド、潜在的なチャンスとリスクを分析し、ユーザーの命格に基づいてパーソナライズされた解読）

【キーポイント】ポイント1、ポイント2、ポイント3、ポイント4、ポイント5（5つのキーポイント、各5-10文字）

【行動アドバイス】（150-200字の具体的なアドバイス、短期的な行動、長期計画、注意すべきタイミングと方位、具体的な開運方法）`,
    ko: `${langCulturePrompts[culture] || langCulturePrompts.none}

${modelDesc} 방법으로 점을 치고 있습니다.

【사용자 정보】
- 질문: ${question}
- 질문 유형: ${questionType}
- 명격: ${baziResult.destinyPattern}
- 신강신약: ${baziResult.bodyStrengthLevel}
- 희용신: ${baziResult.favorableGod || ""}
- 기신: ${baziResult.avoidGod || ""}

다음 형식으로 상세하고 통찰력 있는 점술 해석을 제공해 주세요:

【괘상 해독】(300-500자로 괘상의 의미, 현재 상황, 미래 동향, 잠재적 기회와 위험을 분석하고, 사용자의 명격에 기반한 개인화된 해석)

【핵심 포인트】포인트1, 포인트2, 포인트3, 포인트4, 포인트5 (5개의 핵심 포인트, 각 5-10자)

【행동 조언】(150-200자의 구체적인 조언, 단기 행동, 장기 계획, 주의할 시기와 방위, 구체적인 개운 방법)`,
  };

  const prompt = promptTemplateI18n[language] || promptTemplateI18n.zh;

  // Language-specific default fallbacks
  const defaultFallbacksI18n: Record<string, { result: string; keyPoints: string[]; advice: string }> = {
    zh: {
      result: "天机玄妙，卦象显示您正处于转变期。虽有挑战，但机遇并存。",
      keyPoints: ["贵人相助", "静待时机", "稳中求进"],
      advice: "保持耐心，积极准备，当机会来临时果断把握。",
    },
    en: {
      result: "The cosmic forces reveal you are in a transformative period. Though challenges exist, opportunities abound.",
      keyPoints: ["Helpful allies", "Wait for timing", "Steady progress"],
      advice: "Stay patient, prepare actively, and seize opportunities when they arise.",
    },
    ja: {
      result: "天機は玄妙です。卦象はあなたが転換期にあることを示しています。挑戦はありますが、機会も共存しています。",
      keyPoints: ["貴人の助け", "時を待つ", "着実に進む"],
      advice: "忍耐を持ち、積極的に準備し、チャンスが来たら果敢に掴みましょう。",
    },
    ko: {
      result: "천기가 현묘합니다. 괘상은 당신이 전환기에 있음을 보여줍니다. 도전이 있지만 기회도 함께합니다.",
      keyPoints: ["귀인의 도움", "시기를 기다림", "꾸준한 진전"],
      advice: "인내심을 갖고 적극적으로 준비하여 기회가 오면 과감히 잡으세요.",
    },
  };
  const defaultFallback = defaultFallbacksI18n[language] || defaultFallbacksI18n.zh;

  try {
    const ragContext = await buildRAGContext(
      `占卜 ${questionType} ${question}`,
      { dayStem: baziResult.dayStem, favorableGods: baziResult.favorableGod ? [baziResult.favorableGod] : [] }
    );
    
    const systemPrompt = ragContext 
      ? `${getRAGSystemPrompt(language)}\n\n【命理协议】:\n${ragContext}`
      : undefined;
    
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = systemPrompt
      ? [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }]
      : [{ role: "user", content: prompt }];

    const completion = await kimi.chat.completions.create({
      model: getKimiModel(),
      messages,
      max_tokens: 2000,
    });
    
    const content = completion.choices[0]?.message?.content || "";
    console.log("Divination OpenAI response:", content);
    
    const lines = content.split("\n").filter(l => l.trim());
    let result = "";
    let keyPoints: string[] = [];
    let advice = "";
    
    // Multi-language parsing patterns
    const resultPatterns = language === "zh" ? /【?卦象解读】?[:：]?/g : 
      language === "ja" ? /【?卦象解読】?[:：]?/g :
      language === "ko" ? /【?괘상 해독】?[:：]?/g : /\[?Hexagram Reading\]?[:：]?/gi;
    const keyPatterns = language === "zh" ? /【?关键提示】?[:：]?/g :
      language === "ja" ? /【?キーポイント】?[:：]?/g :
      language === "ko" ? /【?핵심 포인트】?[:：]?/g : /\[?Key Points?\]?[:：]?/gi;
    const advicePatterns = language === "zh" ? /【?行动建议】?[:：]?/g :
      language === "ja" ? /【?行動アドバイス】?[:：]?/g :
      language === "ko" ? /【?행동 조언】?[:：]?/g : /\[?Action Advice\]?[:：]?/gi;
    
    lines.forEach(line => {
      if (line.match(resultPatterns) || line.includes("卦象") || line.includes("解读") || line.includes("Reading")) {
        const parsed = line.replace(resultPatterns, "").replace(/^[\d\.\s]+/, "").trim();
        if (parsed && !result) result = parsed;
      } else if (line.match(keyPatterns) || line.includes("关键") || line.includes("提示") || line.includes("Key")) {
        const parsed = line.replace(keyPatterns, "").replace(/^[\d\.\s]+/, "").trim();
        if (parsed) {
          const points = parsed.split(/[,，、]/);
          keyPoints = points.map(p => p.trim()).filter(p => p.length > 0 && p.length <= 20).slice(0, 3);
        }
      } else if (line.match(advicePatterns) || line.includes("建议") || line.includes("行动") || line.includes("Advice")) {
        const parsed = line.replace(advicePatterns, "").replace(/^[\d\.\s]+/, "").trim();
        if (parsed && !advice) advice = parsed;
      }
    });
    
    if (!result) result = content.replace(/【[^】]+】|\[[^\]]+\]/g, "").slice(0, 200).trim();
    if (keyPoints.length === 0) keyPoints = defaultFallback.keyPoints;
    if (!advice) advice = defaultFallback.advice;
    
    console.log("Parsed divination result:", { result, keyPoints, advice });
    
    return { result, keyPoints, advice };
  } catch (error) {
    console.error("Divination error:", error);
    return defaultFallback;
  }
}

export interface CulturalInterpretation {
  dayMasterDesc: string;
  favorableGodDesc: string;
  avoidGodDesc: string;
  bodyStrengthDesc: string;
  destinyPatternDesc: string;
  grandLuckDesc: string;
  yearlyFortuneDesc: string;
}

export async function generateCulturalInterpretation(
  baziResult: BaziResult,
  culture: string,
  selectedYear: number = new Date().getFullYear(),
  language: string = "zh"
): Promise<CulturalInterpretation> {
  const langInstruction = languageInstructions[language] || languageInstructions.zh;
  
  // Culture styles in multiple languages
  const cultureStylesI18n: Record<string, Record<string, { style: string; context: string }>> = {
    zh: {
      chinese: { style: "洪荒神话风格", context: "以盘古开天、女娲造人、三皇五帝的神话视角，用太极阴阳、五行生克的哲理来解读命理。" },
      japanese: { style: "日式RPG风格", context: "以勇者冒险、职业技能、属性加成的RPG游戏视角，将命理解读为角色养成和冒险指南。" },
      western: { style: "西方奇幻风格", context: "以魔法师、骑士、精灵的奇幻世界视角，用元素魔法和命运预言来解读命理。" },
      buddhist: { style: "佛系禅意风格", context: "以因果轮回、缘起性空的佛法智慧，用禅宗公案和修行指引来解读命理。" },
      arabic: { style: "阿拉伯神话风格", context: "以一千零一夜、神灯精灵、沙漠智者的视角，用神秘的东方智慧来解读命理。" },
      pokemon: { style: "宝可梦风格", context: "以宝可梦训练家的视角，将命理元素比喻为宝可梦属性、技能和进化路线。" },
      marvel: { style: "漫威宇宙风格", context: "以超级英雄、无限宝石、多元宇宙的视角，将命理解读为超能力觉醒和宇宙使命。" },
      genshin: { style: "原神风格", context: "以提瓦特大陆、七元素、命之座的视角，将命理解读为元素共鸣和神之眼觉醒。" },
    },
    en: {
      chinese: { style: "Ancient Chinese Mythology", context: "Using the perspective of Pangu, Nuwa, and the three sovereigns, interpret through Yin-Yang and Five Elements philosophy." },
      japanese: { style: "Japanese RPG Style", context: "Using hero adventures, job skills, and stat bonuses, interpret as character development and adventure guidance." },
      western: { style: "Western Fantasy Style", context: "Using wizards, knights, and elves, interpret through elemental magic and destiny prophecy." },
      buddhist: { style: "Buddhist Zen Style", context: "Using karma and rebirth wisdom, interpret through Zen koans and spiritual guidance." },
      arabic: { style: "Arabian Mythology Style", context: "Using 1001 Nights, genies, and desert sages, interpret through mystical Eastern wisdom." },
      pokemon: { style: "Pokemon Style", context: "Using Pokemon trainer perspective, interpret elements as Pokemon types, skills, and evolution paths." },
      marvel: { style: "Marvel Universe Style", context: "Using superheroes, infinity stones, and multiverse, interpret as power awakening and cosmic mission." },
      genshin: { style: "Genshin Impact Style", context: "Using Teyvat, seven elements, and constellations, interpret as elemental resonance and Vision awakening." },
    },
    ja: {
      chinese: { style: "中国神話スタイル", context: "盤古や女媧、三皇五帝の神話の視点から、太極陰陽と五行の哲理で命理を解読。" },
      japanese: { style: "日本RPGスタイル", context: "勇者の冒険、職業スキル、ステータス加算のRPG視点で、キャラ育成と冒険ガイドとして解読。" },
      western: { style: "西洋ファンタジースタイル", context: "魔法使い、騎士、エルフの視点から、元素魔法と運命予言で解読。" },
      buddhist: { style: "仏教禅スタイル", context: "因果輪廻と縁起空の仏法の知恵で、禅の公案と修行指南として解読。" },
      arabic: { style: "アラビア神話スタイル", context: "千夜一夜、ランプの精、砂漠の賢者の視点から、神秘の東洋の知恵で解読。" },
      pokemon: { style: "ポケモンスタイル", context: "ポケモントレーナーの視点から、命理要素をポケモンの属性、技、進化として解読。" },
      marvel: { style: "マーベルスタイル", context: "スーパーヒーロー、インフィニティストーン、マルチバースの視点で、能力覚醒と宇宙の使命として解読。" },
      genshin: { style: "原神スタイル", context: "テイワット、七元素、命ノ星座の視点から、元素共鳴と神の目覚醒として解読。" },
    },
    ko: {
      chinese: { style: "중국 신화 스타일", context: "반고, 여와, 삼황오제의 신화 관점에서 태극 음양과 오행의 철학으로 명리를 해석." },
      japanese: { style: "일본 RPG 스타일", context: "용사 모험, 직업 스킬, 스탯 보너스의 RPG 관점에서 캐릭터 육성과 모험 가이드로 해석." },
      western: { style: "서양 판타지 스타일", context: "마법사, 기사, 엘프의 관점에서 원소 마법과 운명 예언으로 해석." },
      buddhist: { style: "불교 선 스타일", context: "인과응보와 윤회의 불법 지혜로 선 공안과 수행 지침으로 해석." },
      arabic: { style: "아라비안 신화 스타일", context: "천일야화, 램프의 정령, 사막 현자의 관점에서 신비로운 동양 지혜로 해석." },
      pokemon: { style: "포켓몬 스타일", context: "포켓몬 트레이너 관점에서 명리 요소를 포켓몬 속성, 기술, 진화로 해석." },
      marvel: { style: "마블 스타일", context: "슈퍼히어로, 인피니티 스톤, 멀티버스 관점에서 능력 각성과 우주 사명으로 해석." },
      genshin: { style: "원신 스타일", context: "테이바트, 7원소, 운명의 자리 관점에서 원소 공명과 신의 눈 각성으로 해석." },
    },
  };

  const langStyles = cultureStylesI18n[language] || cultureStylesI18n.zh;
  const cultureInfo = langStyles[culture] || langStyles.chinese;

  const promptTemplatesI18n: Record<string, string> = {
    zh: `你是一位精通中国传统命理的大师。请使用"${cultureInfo.style}"来解读八字命盘。
${cultureInfo.context}

【八字信息】
- 日主：${baziResult.dayStem}（${baziResult.dayMasterElement}${baziResult.dayMasterPolarity}）
- 命格：${baziResult.destinyPattern}
- 身强身弱：${baziResult.bodyStrengthLevel}（${baziResult.bodyStrength}/10分）
- 喜用神：${baziResult.favorableGod || "待定"}
- 忌神：${baziResult.avoidGod || "待定"}
- 查询年份：${selectedYear}年

请按以下格式输出详细解读（每个部分300-500字，要有深度和洞察力）：

【日主五行】详细解读${baziResult.dayStem}${baziResult.dayMasterElement}的性格特质、天赋能力、行事风格，结合${cultureInfo.style}的世界观进行生动描述。
【喜用神】深入分析喜用神${baziResult.favorableGod || ""}的助益作用，如何在生活中运用，以及对应的开运方向和具体建议。
【忌神】详细警示忌神${baziResult.avoidGod || ""}的潜在影响，需要规避的情境和行为，以及化解之道。
【身强身弱】深度解读${baziResult.bodyStrengthLevel}的命理特征，对事业、感情、健康的具体影响，以及相应的发展策略。
【命格】全面诠释${baziResult.destinyPattern}格局的人生使命、核心优势、发展方向，以及如何发挥格局优势。
【大运】详细分析当前大运阶段的整体趋势、机遇与挑战、重点发展领域、需要注意的事项。
【流年】深入解读${selectedYear}年的运势走向，包括事业、财运、感情、健康等各方面的具体预测和建议。`,
    en: `You are a master of Chinese astrology. Interpret the BaZi chart using "${cultureInfo.style}".
${cultureInfo.context}

【Chart Information】
- Day Master: ${baziResult.dayStem} (${baziResult.dayMasterElement} ${baziResult.dayMasterPolarity})
- Destiny Pattern: ${baziResult.destinyPattern}
- Body Strength: ${baziResult.bodyStrengthLevel} (${baziResult.bodyStrength}/10)
- Favorable God: ${baziResult.favorableGod || "TBD"}
- Unfavorable God: ${baziResult.avoidGod || "TBD"}
- Query Year: ${selectedYear}

Please output detailed interpretations in this format (300-500 words each section, with depth and insight):

【Day Master】Detailed interpretation of ${baziResult.dayStem} ${baziResult.dayMasterElement} personality traits, talents, and behavioral style, vividly described through ${cultureInfo.style} worldview.
【Favorable God】In-depth analysis of how ${baziResult.favorableGod || ""} benefits you, how to apply it in life, and specific recommendations for good fortune.
【Unfavorable God】Detailed warnings about ${baziResult.avoidGod || ""} potential influences, situations and behaviors to avoid, and remedies.
【Body Strength】Deep interpretation of ${baziResult.bodyStrengthLevel} characteristics, specific impacts on career, relationships, health, and development strategies.
【Destiny Pattern】Comprehensive explanation of ${baziResult.destinyPattern} life mission, core strengths, development direction, and how to leverage your pattern.
【Grand Luck】Detailed analysis of current grand luck period trends, opportunities, challenges, key development areas, and important considerations.
【Yearly Fortune】In-depth interpretation of ${selectedYear} fortune trends, including specific predictions and advice for career, wealth, relationships, and health.`,
    ja: `あなたは中国伝統の命理の達人です。「${cultureInfo.style}」を使って八字命盤を解読してください。
${cultureInfo.context}

【八字情報】
- 日主：${baziResult.dayStem}（${baziResult.dayMasterElement}${baziResult.dayMasterPolarity}）
- 命格：${baziResult.destinyPattern}
- 身強身弱：${baziResult.bodyStrengthLevel}（${baziResult.bodyStrength}/10点）
- 喜用神：${baziResult.favorableGod || "未定"}
- 忌神：${baziResult.avoidGod || "未定"}
- 照会年：${selectedYear}年

以下の形式で詳細な解読を出力してください（各セクション300-500文字、深みと洞察力を持って）：

【日主五行】${baziResult.dayStem}${baziResult.dayMasterElement}の性格特性、才能、行動スタイルを${cultureInfo.style}の世界観で生き生きと描写。
【喜用神】${baziResult.favorableGod || ""}の恩恵、生活での活用法、開運の方向性と具体的なアドバイスを深く分析。
【忌神】${baziResult.avoidGod || ""}の潜在的影響、避けるべき状況と行動、解消方法を詳しく警告。
【身強身弱】${baziResult.bodyStrengthLevel}の命理特徴、キャリア・恋愛・健康への具体的影響、発展戦略を深く解読。
【命格】${baziResult.destinyPattern}格局の人生使命、核心的強み、発展方向、格局の活かし方を包括的に説明。
【大運】現在の大運段階の全体的傾向、チャンスと課題、重点発展分野、注意事項を詳しく分析。
【流年】${selectedYear}年の運勢動向を深く解読、キャリア・財運・恋愛・健康の具体的予測とアドバイス。`,
    ko: `당신은 중국 전통 명리의 대가입니다. "${cultureInfo.style}"을 사용하여 사주 명반을 해석해 주세요.
${cultureInfo.context}

【사주 정보】
- 일주：${baziResult.dayStem}（${baziResult.dayMasterElement}${baziResult.dayMasterPolarity}）
- 명격：${baziResult.destinyPattern}
- 신강신약：${baziResult.bodyStrengthLevel}（${baziResult.bodyStrength}/10점）
- 희용신：${baziResult.favorableGod || "미정"}
- 기신：${baziResult.avoidGod || "미정"}
- 조회 연도：${selectedYear}년

다음 형식으로 상세한 해석을 출력해 주세요（각 섹션 300-500자, 깊이와 통찰력 있게）：

【일주오행】${baziResult.dayStem}${baziResult.dayMasterElement}의 성격 특성, 재능, 행동 스타일을 ${cultureInfo.style} 세계관으로 생생하게 묘사.
【희용신】${baziResult.favorableGod || ""}의 혜택, 삶에서의 활용법, 행운의 방향과 구체적 조언을 깊이 분석.
【기신】${baziResult.avoidGod || ""}의 잠재적 영향, 피해야 할 상황과 행동, 해소 방법을 상세히 경고.
【신강신약】${baziResult.bodyStrengthLevel}의 명리 특징, 커리어・연애・건강에 대한 구체적 영향, 발전 전략을 깊이 해석.
【명격】${baziResult.destinyPattern} 격국의 인생 사명, 핵심 강점, 발전 방향, 격국 활용법을 포괄적으로 설명.
【대운】현재 대운 단계의 전체적 추세, 기회와 도전, 중점 발전 분야, 주의 사항을 상세히 분석.
【유년】${selectedYear}년 운세 동향을 깊이 해석, 커리어・재운・연애・건강의 구체적 예측과 조언.`,
  };
  
  const prompt = promptTemplatesI18n[language] || promptTemplatesI18n.zh;

  // Language-specific defaults
  const defaultResultsI18n: Record<string, CulturalInterpretation> = {
    zh: {
      dayMasterDesc: `日主${baziResult.dayStem}属${baziResult.dayMasterElement}，${baziResult.dayMasterPolarity}火之象，代表热情与光明。`,
      favorableGodDesc: `喜用${baziResult.favorableGod || "土金"}，可助身平衡，顺势发展。`,
      avoidGodDesc: `忌${baziResult.avoidGod || "木火"}过旺，宜避免其加重失衡。`,
      bodyStrengthDesc: `${baziResult.bodyStrengthLevel}之命，${baziResult.bodyStrength > 5 ? "自信有主见" : "需借助外力"}。`,
      destinyPatternDesc: `${baziResult.destinyPattern}格局，具有独特的人生使命。`,
      grandLuckDesc: `当前大运阶段整体趋势平稳，宜稳步发展。`,
      yearlyFortuneDesc: `${selectedYear}年运势平稳，宜把握机遇。`,
    },
    en: {
      dayMasterDesc: `Day Master ${baziResult.dayStem} belongs to ${baziResult.dayMasterElement}, ${baziResult.dayMasterPolarity} aspect, representing passion and brightness.`,
      favorableGodDesc: `Favorable element ${baziResult.favorableGod || "Earth/Metal"} helps balance and growth.`,
      avoidGodDesc: `Avoid excess of ${baziResult.avoidGod || "Wood/Fire"} to prevent imbalance.`,
      bodyStrengthDesc: `${baziResult.bodyStrengthLevel} destiny, ${baziResult.bodyStrength > 5 ? "confident and decisive" : "benefits from support"}.`,
      destinyPatternDesc: `${baziResult.destinyPattern} pattern with a unique life mission.`,
      grandLuckDesc: `Current grand luck period is stable, suitable for steady development.`,
      yearlyFortuneDesc: `${selectedYear} fortune is stable, seize opportunities.`,
    },
    ja: {
      dayMasterDesc: `日主${baziResult.dayStem}は${baziResult.dayMasterElement}属、${baziResult.dayMasterPolarity}の象、情熱と輝きを表します。`,
      favorableGodDesc: `喜用神${baziResult.favorableGod || "土金"}がバランスと成長を助けます。`,
      avoidGodDesc: `${baziResult.avoidGod || "木火"}の過剰を避けてバランスを保ちましょう。`,
      bodyStrengthDesc: `${baziResult.bodyStrengthLevel}の命、${baziResult.bodyStrength > 5 ? "自信があり決断力がある" : "サポートが有益"}。`,
      destinyPatternDesc: `${baziResult.destinyPattern}の格局、独自の人生使命を持っています。`,
      grandLuckDesc: `現在の大運は安定しており、着実な発展に適しています。`,
      yearlyFortuneDesc: `${selectedYear}年の運勢は安定、チャンスを掴みましょう。`,
    },
    ko: {
      dayMasterDesc: `일주 ${baziResult.dayStem}은 ${baziResult.dayMasterElement} 속성, ${baziResult.dayMasterPolarity}의 상으로 열정과 밝음을 나타냅니다.`,
      favorableGodDesc: `희용신 ${baziResult.favorableGod || "토금"}이 균형과 성장을 돕습니다.`,
      avoidGodDesc: `${baziResult.avoidGod || "목화"}의 과잉을 피하여 균형을 유지하세요.`,
      bodyStrengthDesc: `${baziResult.bodyStrengthLevel}의 명, ${baziResult.bodyStrength > 5 ? "자신감 있고 결단력 있음" : "지원이 유익함"}.`,
      destinyPatternDesc: `${baziResult.destinyPattern} 격국으로 독특한 인생 사명을 가지고 있습니다.`,
      grandLuckDesc: `현재 대운은 안정적이며 꾸준한 발전에 적합합니다.`,
      yearlyFortuneDesc: `${selectedYear}년 운세는 안정적이며 기회를 잡으세요.`,
    },
  };
  
  const defaultResult = defaultResultsI18n[language] || defaultResultsI18n.zh;

  try {
    const ragContext = await buildRAGContext(
      `八字解读 ${baziResult.destinyPattern} ${baziResult.bodyStrengthLevel}`,
      { dayStem: baziResult.dayStem, favorableGods: baziResult.favorableGod ? [baziResult.favorableGod] : [] }
    );
    
    const systemPrompt = ragContext 
      ? `${getRAGSystemPrompt(language)}\n\n【命理协议】:\n${ragContext}`
      : undefined;
    
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = systemPrompt
      ? [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }]
      : [{ role: "user", content: prompt }];

    const completion = await kimi.chat.completions.create({
      model: getKimiModel(),
      messages,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || "";
    console.log("OpenAI cultural interpretation response:", content);
    
    const lines = content.split("\n").filter(l => l.trim());

    const result = { ...defaultResult };
    
    lines.forEach(line => {
      if (line.includes("日主五行") || line.includes("日主")) {
        const parsed = line.replace(/【?日主五行】?[:：]?/g, "").trim();
        if (parsed) result.dayMasterDesc = parsed;
      } else if (line.includes("喜用神") || line.includes("喜用")) {
        const parsed = line.replace(/【?喜用神】?[:：]?/g, "").trim();
        if (parsed) result.favorableGodDesc = parsed;
      } else if (line.includes("忌神")) {
        const parsed = line.replace(/【?忌神】?[:：]?/g, "").trim();
        if (parsed) result.avoidGodDesc = parsed;
      } else if (line.includes("身强身弱") || line.includes("身强") || line.includes("身弱")) {
        const parsed = line.replace(/【?身强身弱】?[:：]?/g, "").trim();
        if (parsed) result.bodyStrengthDesc = parsed;
      } else if (line.includes("命格")) {
        const parsed = line.replace(/【?命格】?[:：]?/g, "").trim();
        if (parsed) result.destinyPatternDesc = parsed;
      } else if (line.includes("大运")) {
        const parsed = line.replace(/【?大运】?[:：]?/g, "").trim();
        if (parsed) result.grandLuckDesc = parsed;
      } else if (line.includes("流年")) {
        const parsed = line.replace(/【?流年】?[:：]?/g, "").trim();
        if (parsed) result.yearlyFortuneDesc = parsed;
      }
    });

    console.log("Parsed cultural interpretation:", result);
    return result;
  } catch (error) {
    console.error("Cultural interpretation error:", error);
    return defaultResult;
  }
}

export async function generateMatchingAnalysis(
  userBazi: BaziResult,
  partnerBazi: BaziResult,
  relationshipType: string,
  culture: string = "china",
  language: string = "zh"
): Promise<{
  matchScore: number;
  matchConclusion: string;
  dimensionAnalysis: Record<string, { score: number; desc: string }>;
  culturalInterpretation: string;
}> {
  const userElement = userBazi.fiveElements;
  const partnerElement = partnerBazi.fiveElements;
  
  let baseScore = 60;
  
  const elements = ["木", "火", "土", "金", "水"];
  elements.forEach(el => {
    const diff = Math.abs((userElement[el] || 0) - (partnerElement[el] || 0));
    if (diff <= 1) baseScore += 3;
    else if (diff >= 3) baseScore -= 2;
  });
  
  if (userBazi.bodyStrengthLevel !== partnerBazi.bodyStrengthLevel) {
    baseScore += 5;
  }
  
  const matchScore = Math.max(30, Math.min(100, baseScore + Math.floor(Math.random() * 15)));
  
  // Language-specific dimension descriptions
  const dimensionDescsI18n: Record<string, Record<string, { good: string; bad: string }>> = {
    zh: {
      emotional: { good: "情感默契度高，能够心灵相通", bad: "需要更多沟通和理解" },
      career: { good: "事业上能够互相支持", bad: "各有优势，需要协调配合" },
      wealth: { good: "财运互补，理财观念相近", bad: "理财观念需要磨合" },
      family: { good: "家庭观念一致，和谐美满", bad: "家庭责任分配需要协商" },
    },
    en: {
      emotional: { good: "High emotional connection, deeply in tune", bad: "Need more communication and understanding" },
      career: { good: "Strong mutual career support", bad: "Different strengths, need coordination" },
      wealth: { good: "Complementary finances, similar values", bad: "Financial views need alignment" },
      family: { good: "Aligned family values, harmonious", bad: "Family responsibilities need discussion" },
    },
    ja: {
      emotional: { good: "感情の相性が高く、心が通じ合う", bad: "より多くのコミュニケーションと理解が必要" },
      career: { good: "仕事で互いにサポートできる", bad: "それぞれの強みがあり、調整が必要" },
      wealth: { good: "金運が補完し合い、価値観が近い", bad: "金銭感覚の調整が必要" },
      family: { good: "家族観が一致し、調和的", bad: "家族の責任分担について話し合いが必要" },
    },
    ko: {
      emotional: { good: "감정적 유대감이 높고 마음이 통함", bad: "더 많은 소통과 이해가 필요함" },
      career: { good: "서로의 커리어를 강력하게 지원", bad: "각자의 강점이 있어 조율이 필요함" },
      wealth: { good: "재정이 보완적이고 가치관이 비슷함", bad: "금전 관점의 조율이 필요함" },
      family: { good: "가족 가치관이 일치하고 조화로움", bad: "가족 책임에 대한 논의가 필요함" },
    },
  };
  const langDimDescs = dimensionDescsI18n[language] || dimensionDescsI18n.zh;
  
  const dimensions = {
    emotional: {
      score: matchScore + Math.floor(Math.random() * 10) - 5,
      desc: matchScore >= 70 ? langDimDescs.emotional.good : langDimDescs.emotional.bad,
    },
    career: {
      score: matchScore + Math.floor(Math.random() * 10) - 5,
      desc: matchScore >= 70 ? langDimDescs.career.good : langDimDescs.career.bad,
    },
    wealth: {
      score: matchScore + Math.floor(Math.random() * 10) - 5,
      desc: matchScore >= 70 ? langDimDescs.wealth.good : langDimDescs.wealth.bad,
    },
    family: {
      score: matchScore + Math.floor(Math.random() * 10) - 5,
      desc: matchScore >= 70 ? langDimDescs.family.good : langDimDescs.family.bad,
    },
  };
  
  Object.keys(dimensions).forEach(key => {
    const dim = dimensions[key as keyof typeof dimensions];
    dim.score = Math.max(30, Math.min(100, dim.score));
  });
  
  // Language-specific conclusions
  const conclusionsI18n: Record<string, { perfect: string; good: string; ok: string; challenge: string }> = {
    zh: {
      perfect: "你们是天作之合，命理上高度契合，相处融洽，互相扶持。",
      good: "你们的组合良好，虽有小差异但可以互补，共同成长。",
      ok: "你们需要更多磨合和理解，用心经营可以幸福。",
      challenge: "命理上存在一些挑战，需要双方共同努力克服。",
    },
    en: {
      perfect: "You are a perfect match, highly compatible, harmonious and supportive.",
      good: "Your combination is good, small differences complement each other for growth.",
      ok: "You need more adjustment and understanding, care leads to happiness.",
      challenge: "Some challenges exist that require mutual effort to overcome.",
    },
    ja: {
      perfect: "あなたたちは天作の相性、命理上で高度に調和し、互いに支え合います。",
      good: "良い組み合わせで、小さな違いは補い合い、共に成長できます。",
      ok: "より多くの調整と理解が必要で、心を込めれば幸せになれます。",
      challenge: "いくつかの課題があり、双方の努力で克服が必要です。",
    },
    ko: {
      perfect: "당신들은 천생연분으로, 명리적으로 고도로 조화롭고 서로 지지합니다.",
      good: "좋은 조합으로, 작은 차이는 서로 보완하며 함께 성장합니다.",
      ok: "더 많은 조율과 이해가 필요하며, 정성을 다하면 행복해질 수 있습니다.",
      challenge: "몇 가지 도전이 있으며, 양측의 노력으로 극복이 필요합니다.",
    },
  };
  const langConclusions = conclusionsI18n[language] || conclusionsI18n.zh;
  
  let matchConclusion = "";
  if (matchScore >= 85) {
    matchConclusion = langConclusions.perfect;
  } else if (matchScore >= 70) {
    matchConclusion = langConclusions.good;
  } else if (matchScore >= 55) {
    matchConclusion = langConclusions.ok;
  } else {
    matchConclusion = langConclusions.challenge;
  }
  
  // Language-specific cultural interpretations
  const cultureInterpretationsI18n: Record<string, Record<string, string>> = {
    zh: {
      none: `从命理角度分析，你们的五行${matchScore >= 70 ? "相生相合，能量互补" : "各有特点，需要磨合"}，${matchScore >= 70 ? "是良好的搭配" : "可通过理解和包容增进关系"}。`,
      china: `从洪荒神话角度看，你们如同${matchScore >= 70 ? "伏羲与女娲，阴阳互补" : "共工与祝融，能量碰撞"}，${matchScore >= 70 ? "携手可成大业" : "需要智慧化解冲突"}。`,
      japan: `在RPG冒险中，你们是${matchScore >= 70 ? "最佳的冒险搭档，技能互补" : "性格迥异的队友"}，${matchScore >= 70 ? "共同面对BOSS无往不利" : "需要更多默契训练"}。`,
      western: `在西方奇幻世界中，你们如同${matchScore >= 70 ? "命运之轮上的双子星，相互辉映" : "不同阵营的冒险者"}，${matchScore >= 70 ? "共同书写传奇篇章" : "需要跨越界限的勇气"}。`,
      buddhist: `从因果轮回角度看，你们${matchScore >= 70 ? "前世有缘，今生再续" : "业力交织，相互成就"}，${matchScore >= 70 ? "是修行路上的善缘" : "可借此因缘修心养性"}。`,
      arabic: `在阿拉伯神话中，你们如同${matchScore >= 70 ? "命运之书上的并行篇章，相互呼应" : "不同星座的守护者"}，${matchScore >= 70 ? "是真主安排的缘分" : "需要智慧和耐心"}。`,
      pokemon: `从宝可梦视角，你们的属性${matchScore >= 70 ? "相性极佳，如同皮卡丘与小智" : "需要更多磨合"}，${matchScore >= 70 ? "战斗力加成明显" : "可以通过训练增进默契"}。`,
      marvel: `在漫威多元宇宙中，你们的命运线${matchScore >= 70 ? "在多个宇宙中都交织在一起" : "有着独特的相遇轨迹"}，${matchScore >= 70 ? "是命中注定的搭档" : "需要跨越次元的努力"}。`,
      genshin: `从提瓦特的元素角度，你们的元素${matchScore >= 70 ? "能产生强力的元素反应" : "需要找到正确的反应方式"}，${matchScore >= 70 ? "组队探索事半功倍" : "各有所长，互相学习"}。`,
    },
    en: {
      none: `From an astrological perspective, your Five Elements ${matchScore >= 70 ? "harmonize well, complementing each other" : "have unique traits, needing adjustment"}. ${matchScore >= 70 ? "A great match" : "Understanding and tolerance will strengthen the relationship"}.`,
      china: `In ancient Chinese mythology, you are like ${matchScore >= 70 ? "Fuxi and Nuwa, yin and yang complementing" : "Gonggong and Zhurong, energies colliding"}. ${matchScore >= 70 ? "Together you can achieve greatness" : "Wisdom is needed to resolve conflicts"}.`,
      japan: `In the RPG adventure, you are ${matchScore >= 70 ? "the best adventure partners, skills complementing" : "teammates with different personalities"}. ${matchScore >= 70 ? "Unstoppable against bosses together" : "Need more synergy training"}.`,
      western: `In the Western fantasy world, you are like ${matchScore >= 70 ? "twin stars on the wheel of fate, shining together" : "adventurers from different factions"}. ${matchScore >= 70 ? "Writing legendary chapters together" : "Courage is needed to cross boundaries"}.`,
      buddhist: `From a karmic perspective, you ${matchScore >= 70 ? "were destined to meet, continuing past connections" : "have intertwined karma, helping each other grow"}. ${matchScore >= 70 ? "Good companions on the spiritual path" : "Use this connection to cultivate the heart"}.`,
      arabic: `In Arabian mythology, you are like ${matchScore >= 70 ? "parallel chapters in the Book of Fate, echoing each other" : "guardians of different constellations"}. ${matchScore >= 70 ? "A connection arranged by destiny" : "Wisdom and patience are needed"}.`,
      pokemon: `From a Pokemon perspective, your types ${matchScore >= 70 ? "have excellent synergy, like Pikachu and Ash" : "need more training together"}. ${matchScore >= 70 ? "Significant battle bonus" : "Training will improve teamwork"}.`,
      marvel: `In the Marvel multiverse, your destiny lines ${matchScore >= 70 ? "intertwine across multiple universes" : "have unique encounter trajectories"}. ${matchScore >= 70 ? "Destined partners" : "Cross-dimensional effort is needed"}.`,
      genshin: `From Teyvat's elemental perspective, your elements ${matchScore >= 70 ? "create powerful elemental reactions" : "need to find the right reaction pattern"}. ${matchScore >= 70 ? "Exploration is twice as effective together" : "Each has strengths, learn from each other"}.`,
    },
    ja: {
      none: `命理の観点から、あなたたちの五行は${matchScore >= 70 ? "相生相合し、エネルギーが補完" : "それぞれの特徴があり、調整が必要"}。${matchScore >= 70 ? "良い組み合わせ" : "理解と寛容で関係を深められる"}。`,
      china: `洪荒神話の視点から、あなたたちは${matchScore >= 70 ? "伏羲と女媧のように陰陽が補完" : "共工と祝融のようにエネルギーが衝突"}。${matchScore >= 70 ? "共に大業を成せる" : "知恵で衝突を解消が必要"}。`,
      japan: `RPG冒険では、あなたたちは${matchScore >= 70 ? "最高の冒険パートナー、スキルが補完" : "性格の異なるチームメイト"}。${matchScore >= 70 ? "ボス戦で無敵" : "より多くの連携訓練が必要"}。`,
      western: `西洋ファンタジーでは、${matchScore >= 70 ? "運命の輪の双子星のように輝き合う" : "異なる陣営の冒険者"}。${matchScore >= 70 ? "共に伝説の章を書く" : "境界を越える勇気が必要"}。`,
      buddhist: `因果輪廻の視点から、${matchScore >= 70 ? "前世の縁で今生再会" : "業が交錯し互いに成長"}。${matchScore >= 70 ? "修行の道の善縁" : "この縁で心を養える"}。`,
      arabic: `アラビア神話では、${matchScore >= 70 ? "運命の書の並行章のように呼応" : "異なる星座の守護者"}。${matchScore >= 70 ? "運命が定めた縁" : "知恵と忍耐が必要"}。`,
      pokemon: `ポケモンの視点から、タイプの相性が${matchScore >= 70 ? "抜群、ピカチュウとサトシのように" : "より多くの訓練が必要"}。${matchScore >= 70 ? "戦闘力ボーナスが顕著" : "訓練でチームワークを向上"}。`,
      marvel: `マーベルマルチバースでは、運命線が${matchScore >= 70 ? "複数の宇宙で交錯" : "独特な出会いの軌跡を持つ"}。${matchScore >= 70 ? "運命のパートナー" : "次元を越える努力が必要"}。`,
      genshin: `テイワットの元素視点から、元素が${matchScore >= 70 ? "強力な元素反応を起こせる" : "正しい反応パターンを見つける必要"}。${matchScore >= 70 ? "一緒に探索で効率倍増" : "互いの長所から学ぶ"}。`,
    },
    ko: {
      none: `명리 관점에서, 당신들의 오행은 ${matchScore >= 70 ? "상생상합하며 에너지가 보완" : "각각의 특성이 있어 조율 필요"}. ${matchScore >= 70 ? "좋은 조합" : "이해와 포용으로 관계를 깊게"}.`,
      china: `홍황신화 관점에서, 당신들은 ${matchScore >= 70 ? "복희와 여와처럼 음양 보완" : "공공과 축융처럼 에너지 충돌"}. ${matchScore >= 70 ? "함께 대업을 이룰 수 있음" : "지혜로 갈등 해소 필요"}.`,
      japan: `RPG 모험에서, 당신들은 ${matchScore >= 70 ? "최고의 모험 파트너, 스킬 보완" : "성격이 다른 팀원"}. ${matchScore >= 70 ? "보스전에서 무적" : "더 많은 호흡 훈련 필요"}.`,
      western: `서양 판타지에서, ${matchScore >= 70 ? "운명의 바퀴 위 쌍둥이 별처럼 빛나" : "다른 진영의 모험가"}. ${matchScore >= 70 ? "함께 전설의 장을 써" : "경계를 넘는 용기 필요"}.`,
      buddhist: `인과윤회 관점에서, ${matchScore >= 70 ? "전생의 인연으로 금생 재회" : "업이 얽혀 서로 성장"}. ${matchScore >= 70 ? "수행길의 좋은 인연" : "이 인연으로 마음을 닦을 수 있음"}.`,
      arabic: `아라비안 신화에서, ${matchScore >= 70 ? "운명의 책의 병행 장처럼 호응" : "다른 별자리의 수호자"}. ${matchScore >= 70 ? "운명이 정한 인연" : "지혜와 인내 필요"}.`,
      pokemon: `포켓몬 관점에서, 타입 상성이 ${matchScore >= 70 ? "최고, 피카츄와 사토시처럼" : "더 많은 훈련 필요"}. ${matchScore >= 70 ? "전투력 보너스 현저" : "훈련으로 팀워크 향상"}.`,
      marvel: `마블 멀티버스에서, 운명선이 ${matchScore >= 70 ? "여러 우주에서 교차" : "독특한 만남의 궤적"}. ${matchScore >= 70 ? "운명의 파트너" : "차원을 넘는 노력 필요"}.`,
      genshin: `테이바트 원소 관점에서, 원소가 ${matchScore >= 70 ? "강력한 원소 반응 가능" : "올바른 반응 패턴 찾기 필요"}. ${matchScore >= 70 ? "함께 탐험 효율 배증" : "서로의 장점에서 배움"}.`,
    },
  };
  
  const langCultureInterpretations = cultureInterpretationsI18n[language] || cultureInterpretationsI18n.zh;
  const culturalInterpretation = langCultureInterpretations[culture] || langCultureInterpretations.none;
  
  return {
    matchScore,
    matchConclusion,
    dimensionAnalysis: dimensions,
    culturalInterpretation,
  };
}

// Translate content to a different language using AI
export async function translateContent(
  content: {
    aiInterpretation?: string;
    careerDesc?: string;
    loveDesc?: string;
    wealthDesc?: string;
    healthDesc?: string;
    studyDesc?: string;
    insights?: string[];
    recommendations?: string[];
    hourlyFortunes?: Array<{ favorable: string; unfavorable: string }>;
  },
  targetLanguage: string
): Promise<typeof content> {
  const langInstruction = languageInstructions[targetLanguage] || languageInstructions.zh;
  const langName = targetLanguage === "zh" ? "Chinese" : targetLanguage === "en" ? "English" : targetLanguage === "ja" ? "Japanese" : "Korean";
  
  try {
    const textsToTranslate: string[] = [];
    const keys: string[] = [];
    
    if (content.aiInterpretation) {
      textsToTranslate.push(content.aiInterpretation);
      keys.push("aiInterpretation");
    }
    if (content.careerDesc) {
      textsToTranslate.push(content.careerDesc);
      keys.push("careerDesc");
    }
    if (content.loveDesc) {
      textsToTranslate.push(content.loveDesc);
      keys.push("loveDesc");
    }
    if (content.wealthDesc) {
      textsToTranslate.push(content.wealthDesc);
      keys.push("wealthDesc");
    }
    if (content.healthDesc) {
      textsToTranslate.push(content.healthDesc);
      keys.push("healthDesc");
    }
    if (content.studyDesc) {
      textsToTranslate.push(content.studyDesc);
      keys.push("studyDesc");
    }
    if (content.insights && content.insights.length > 0) {
      content.insights.forEach((insight, i) => {
        textsToTranslate.push(insight);
        keys.push(`insight_${i}`);
      });
    }
    if (content.recommendations && content.recommendations.length > 0) {
      content.recommendations.forEach((rec, i) => {
        textsToTranslate.push(rec);
        keys.push(`recommendation_${i}`);
      });
    }
    if (content.hourlyFortunes && content.hourlyFortunes.length > 0) {
      content.hourlyFortunes.forEach((hf, i) => {
        textsToTranslate.push(hf.favorable);
        keys.push(`hourly_favorable_${i}`);
        textsToTranslate.push(hf.unfavorable);
        keys.push(`hourly_unfavorable_${i}`);
      });
    }
    
    if (textsToTranslate.length === 0) {
      return content;
    }
    
    const prompt = `Translate the following texts to ${langName}. Return a JSON object with a "translations" array containing the translations in the same order.
${langInstruction}

Texts to translate:
${JSON.stringify(textsToTranslate)}

Return ONLY a valid JSON object like: {"translations": ["translated text 1", "translated text 2", ...]}`;

    const completion = await kimi.chat.completions.create({
      model: FAST_TRANSLATION_MODEL, // Use fast model for translations
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });
    
    const responseText = completion.choices[0]?.message?.content || "{}";
    let translations: string[];
    try {
      const parsed = JSON.parse(responseText);
      translations = parsed.translations || (Array.isArray(parsed) ? parsed : []);
      if (translations.length === 0) {
        console.error("No translations returned for", targetLanguage, responseText);
        return content;
      }
    } catch (e) {
      console.error("Failed to parse translations:", e, responseText);
      return content;
    }
    
    const result = { ...content };
    const newInsights: string[] = [];
    const newRecommendations: string[] = [];
    const newHourlyFortunes: Array<{ favorable: string; unfavorable: string }> = content.hourlyFortunes ? [...content.hourlyFortunes] : [];
    
    keys.forEach((key, index) => {
      const translated = translations[index];
      if (!translated) return;
      
      if (key === "aiInterpretation") result.aiInterpretation = translated;
      else if (key === "careerDesc") result.careerDesc = translated;
      else if (key === "loveDesc") result.loveDesc = translated;
      else if (key === "wealthDesc") result.wealthDesc = translated;
      else if (key === "healthDesc") result.healthDesc = translated;
      else if (key === "studyDesc") result.studyDesc = translated;
      else if (key.startsWith("insight_")) {
        const i = parseInt(key.split("_")[1]);
        newInsights[i] = translated;
      }
      else if (key.startsWith("recommendation_")) {
        const i = parseInt(key.split("_")[1]);
        newRecommendations[i] = translated;
      }
      else if (key.startsWith("hourly_favorable_")) {
        const i = parseInt(key.split("_")[2]);
        if (newHourlyFortunes[i]) newHourlyFortunes[i].favorable = translated;
      }
      else if (key.startsWith("hourly_unfavorable_")) {
        const i = parseInt(key.split("_")[2]);
        if (newHourlyFortunes[i]) newHourlyFortunes[i].unfavorable = translated;
      }
    });
    
    if (newInsights.length > 0) result.insights = newInsights;
    if (newRecommendations.length > 0) result.recommendations = newRecommendations;
    if (newHourlyFortunes.length > 0) result.hourlyFortunes = newHourlyFortunes;
    
    return result;
  } catch (error) {
    console.error("Translation error:", error);
    return content;
  }
}

// Translate divination response
export async function translateDivinationResponse(
  response: string,
  targetLanguage: string
): Promise<string> {
  const langInstruction = languageInstructions[targetLanguage] || languageInstructions.zh;
  const langName = targetLanguage === "zh" ? "Chinese" : targetLanguage === "en" ? "English" : targetLanguage === "ja" ? "Japanese" : "Korean";
  
  try {
    const prompt = `Translate the following fortune-telling/divination response to ${langName}. Maintain the mystical and professional tone.
${langInstruction}

Text to translate:
${response}`;

    const completion = await kimi.chat.completions.create({
      model: FAST_TRANSLATION_MODEL, // Use fast model for translations
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
    });
    
    return completion.choices[0]?.message?.content || response;
  } catch (error) {
    console.error("Translation error:", error);
    return response;
  }
}

// Translate BaZi cultural interpretation
export async function translateBaziInterpretation(
  interpretation: {
    dayMasterDesc?: string;
    favorableGodDesc?: string;
    bodyStrengthDesc?: string;
    destinyPatternDesc?: string;
  },
  targetLanguage: string
): Promise<typeof interpretation> {
  const langInstruction = languageInstructions[targetLanguage] || languageInstructions.zh;
  const langName = targetLanguage === "zh" ? "Chinese" : targetLanguage === "en" ? "English" : targetLanguage === "ja" ? "Japanese" : "Korean";
  
  try {
    const textsToTranslate: string[] = [];
    const keys: string[] = [];
    
    if (interpretation.dayMasterDesc) {
      textsToTranslate.push(interpretation.dayMasterDesc);
      keys.push("dayMasterDesc");
    }
    if (interpretation.favorableGodDesc) {
      textsToTranslate.push(interpretation.favorableGodDesc);
      keys.push("favorableGodDesc");
    }
    if (interpretation.bodyStrengthDesc) {
      textsToTranslate.push(interpretation.bodyStrengthDesc);
      keys.push("bodyStrengthDesc");
    }
    if (interpretation.destinyPatternDesc) {
      textsToTranslate.push(interpretation.destinyPatternDesc);
      keys.push("destinyPatternDesc");
    }
    
    if (textsToTranslate.length === 0) {
      return interpretation;
    }
    
    const prompt = `Translate the following BaZi/astrology interpretation texts to ${langName}. Return a JSON array with the translations in the same order. Maintain the professional fortune-telling tone.
${langInstruction}

Texts to translate:
${JSON.stringify(textsToTranslate)}

Return ONLY a valid JSON array of translated strings, nothing else.`;

    const completion = await kimi.chat.completions.create({
      model: FAST_TRANSLATION_MODEL, // Use fast model for translations
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });
    
    const responseText = completion.choices[0]?.message?.content || "{}";
    let translations: string[];
    try {
      const parsed = JSON.parse(responseText);
      translations = Array.isArray(parsed) ? parsed : (parsed.translations || []);
    } catch {
      return interpretation;
    }
    
    const result = { ...interpretation };
    keys.forEach((key, index) => {
      const translated = translations[index];
      if (!translated) return;
      
      if (key === "dayMasterDesc") result.dayMasterDesc = translated;
      else if (key === "favorableGodDesc") result.favorableGodDesc = translated;
      else if (key === "bodyStrengthDesc") result.bodyStrengthDesc = translated;
      else if (key === "destinyPatternDesc") result.destinyPatternDesc = translated;
    });
    
    return result;
  } catch (error) {
    console.error("Translation error:", error);
    return interpretation;
  }
}

// Generate deep reading for Grand Luck or Yearly Fortune with culture support
export async function generateDeepReading(
  baziResult: BaziResult,
  type: "grandLuck" | "yearlyFortune" | string,
  data: any,
  language: string = "zh",
  culture: string = "none",
  subscriptionTier: string = "free"
): Promise<string> {
  const langInstruction = languageInstructions[language] || languageInstructions.zh;
  
  // Culture styles for deep reading
  const cultureStylesI18n: Record<string, Record<string, { style: string; context: string }>> = {
    zh: {
      none: { style: "中国传统命理", context: "用传统命理学的专业视角进行解读。" },
      chinese: { style: "洪荒神话风格", context: "以盘古开天、女娲造人的神话视角，用上古神话的意象解读。" },
      japanese: { style: "日式RPG风格", context: "以勇者冒险、技能加点、属性提升的RPG视角进行解读。" },
      western: { style: "西方奇幻风格", context: "以魔法师、骑士、精灵的奇幻世界视角进行解读。" },
      buddhist: { style: "佛系禅意风格", context: "以因果轮回、缘起性空的佛法智慧进行解读。" },
      arabic: { style: "阿拉伯神话风格", context: "以一千零一夜、神灯精灵的神秘视角进行解读。" },
      pokemon: { style: "宝可梦风格", context: "以宝可梦训练家的视角，用宝可梦属性和进化来解读。" },
      marvel: { style: "漫威宇宙风格", context: "以超级英雄、无限宝石的视角进行解读。" },
      genshin: { style: "原神风格", context: "以提瓦特大陆、七元素、命之座的视角进行解读。" },
    },
    en: {
      none: { style: "Traditional Chinese Astrology", context: "Interpret using professional Chinese astrology perspective." },
      chinese: { style: "Ancient Chinese Mythology", context: "Using Pangu, Nuwa, and ancient mythological imagery." },
      japanese: { style: "Japanese RPG Style", context: "Using hero adventures, skill points, and stat boosts perspective." },
      western: { style: "Western Fantasy", context: "Using wizards, knights, and elves fantasy world perspective." },
      buddhist: { style: "Buddhist Zen Style", context: "Using karma, rebirth, and Buddhist wisdom perspective." },
      arabic: { style: "Arabian Mythology", context: "Using 1001 Nights and genie mystical perspective." },
      pokemon: { style: "Pokemon Style", context: "Using Pokemon trainer perspective with types and evolution." },
      marvel: { style: "Marvel Universe", context: "Using superheroes and infinity stones perspective." },
      genshin: { style: "Genshin Impact", context: "Using Teyvat, seven elements, and constellation perspective." },
    },
    ja: {
      none: { style: "中国伝統命理", context: "伝統的な命理学の専門的視点で解読。" },
      chinese: { style: "中国神話スタイル", context: "盤古や女媧の神話の視点から解読。" },
      japanese: { style: "日本RPGスタイル", context: "勇者の冒険、スキル、ステータスの視点で解読。" },
      western: { style: "西洋ファンタジー", context: "魔法使い、騎士、エルフの視点で解読。" },
      buddhist: { style: "仏教禅スタイル", context: "因果応報と仏法の知恵で解読。" },
      arabic: { style: "アラビア神話", context: "千夜一夜と精霊の神秘的視点で解読。" },
      pokemon: { style: "ポケモンスタイル", context: "ポケモントレーナーの視点で解読。" },
      marvel: { style: "マーベルスタイル", context: "スーパーヒーローとインフィニティストーンで解読。" },
      genshin: { style: "原神スタイル", context: "テイワットと元素で解読。" },
    },
    ko: {
      none: { style: "중국 전통 명리", context: "전통 명리학 전문적 관점으로 해석." },
      chinese: { style: "중국 신화 스타일", context: "반고와 여와 신화 관점으로 해석." },
      japanese: { style: "일본 RPG 스타일", context: "용사 모험과 스킬 관점으로 해석." },
      western: { style: "서양 판타지", context: "마법사와 기사 관점으로 해석." },
      buddhist: { style: "불교 선 스타일", context: "인과응보와 불법 지혜로 해석." },
      arabic: { style: "아라비안 신화", context: "천일야화와 정령 관점으로 해석." },
      pokemon: { style: "포켓몬 스타일", context: "포켓몬 트레이너 관점으로 해석." },
      marvel: { style: "마블 스타일", context: "슈퍼히어로와 인피니티 스톤으로 해석." },
      genshin: { style: "원신 스타일", context: "테이바트와 원소로 해석." },
    },
  };

  const langStyles = cultureStylesI18n[language] || cultureStylesI18n.zh;
  const cultureInfo = langStyles[culture] || langStyles.none;
  
  let promptTemplateI18n: Record<string, string>;
  
  if (type === "grandLuck") {
    promptTemplateI18n = {
      zh: `你是一位精通中国传统命理的大师。请使用"${cultureInfo.style}"解读以下大运阶段。
${cultureInfo.context}

【用户八字信息】
- 日主：${baziResult.dayStem}（${baziResult.dayMasterElement}${baziResult.dayMasterPolarity}）
- 命格：${baziResult.destinyPattern}
- 身强身弱：${baziResult.bodyStrengthLevel}
- 喜用神：${baziResult.favorableGod || ""}
- 忌神：${baziResult.avoidGod || ""}

【大运信息】
- 大运干支：${data.stem}${data.branch}
- 年龄区间：${data.startAge}-${data.endAge}岁
- 时间范围：${data.startYear}-${data.endYear}年

请提供简洁精准的大运解读（200-300字），包括：
1. 大运干支与日主关系
2. 十年运势特点
3. 事业财运感情健康预测
4. 重要建议

${langInstruction}`,
      en: `You are a master of Chinese astrology. Interpret the following Grand Luck period using "${cultureInfo.style}".
${cultureInfo.context}

【User's BaZi Information】
- Day Master: ${baziResult.dayStem} (${baziResult.dayMasterElement} ${baziResult.dayMasterPolarity})
- Destiny Pattern: ${baziResult.destinyPattern}
- Body Strength: ${baziResult.bodyStrengthLevel}
- Favorable God: ${baziResult.favorableGod || ""}
- Unfavorable God: ${baziResult.avoidGod || ""}

【Grand Luck Information】
- Grand Luck Pillars: ${data.stem}${data.branch}
- Age Range: ${data.startAge}-${data.endAge} years old
- Time Period: ${data.startYear}-${data.endYear}

Please provide a concise Grand Luck interpretation (200-300 characters), including:
1. Grand Luck and Day Master relationship
2. Decade fortune trends
3. Career, wealth, relationship, health predictions
4. Key advice

${langInstruction}`,
      ja: `あなたは中国伝統命理の達人です。「${cultureInfo.style}」を使って以下の大運を解読してください。
${cultureInfo.context}

【ユーザーの八字情報】
- 日主：${baziResult.dayStem}（${baziResult.dayMasterElement}${baziResult.dayMasterPolarity}）
- 命格：${baziResult.destinyPattern}
- 身強身弱：${baziResult.bodyStrengthLevel}
- 喜用神：${baziResult.favorableGod || ""}
- 忌神：${baziResult.avoidGod || ""}

【大運情報】
- 大運干支：${data.stem}${data.branch}
- 年齢範囲：${data.startAge}-${data.endAge}歳
- 期間：${data.startYear}-${data.endYear}年

簡潔な大運解読（200-300字）を提供してください：
1. 大運と日主の関係
2. 10年の運勢特徴
3. 事業財運恋愛健康予測
4. 重要なアドバイス

${langInstruction}`,
      ko: `당신은 중국 전통 명리의 대가입니다. "${cultureInfo.style}"을 사용하여 다음 대운을 해석해 주세요.
${cultureInfo.context}

【사용자 사주 정보】
- 일주：${baziResult.dayStem}（${baziResult.dayMasterElement}${baziResult.dayMasterPolarity}）
- 명격：${baziResult.destinyPattern}
- 신강신약：${baziResult.bodyStrengthLevel}
- 희용신：${baziResult.favorableGod || ""}
- 기신：${baziResult.avoidGod || ""}

【대운 정보】
- 대운 간지：${data.stem}${data.branch}
- 연령 범위：${data.startAge}-${data.endAge}세
- 기간：${data.startYear}-${data.endYear}년

간결한 대운 해석（200-300자）을 제공해 주세요：
1. 대운과 일주 관계
2. 10년 운세 특징
3. 직업 재운 연애 건강 예측
4. 중요한 조언

${langInstruction}`,
    };
  } else {
    promptTemplateI18n = {
      zh: `你是一位精通中国传统命理的大师。请使用"${cultureInfo.style}"解读以下流年运势。
${cultureInfo.context}

【用户八字信息】
- 日主：${baziResult.dayStem}（${baziResult.dayMasterElement}${baziResult.dayMasterPolarity}）
- 命格：${baziResult.destinyPattern}
- 身强身弱：${baziResult.bodyStrengthLevel}
- 喜用神：${baziResult.favorableGod || ""}
- 忌神：${baziResult.avoidGod || ""}

【流年信息】
- 流年干支：${data.stem}${data.branch}
- 年份：${data.year}年
- 虚岁：${data.age}岁
- 十神：${data.tenGod}

请提供简洁精准的流年解读（200-300字），包括：
1. 流年与日主关系
2. 年度运势特点
3. 事业财运感情健康预测
4. 开运建议

${langInstruction}`,
      en: `You are a master of Chinese astrology. Interpret the following Yearly Fortune using "${cultureInfo.style}".
${cultureInfo.context}

【User's BaZi Information】
- Day Master: ${baziResult.dayStem} (${baziResult.dayMasterElement} ${baziResult.dayMasterPolarity})
- Destiny Pattern: ${baziResult.destinyPattern}
- Body Strength: ${baziResult.bodyStrengthLevel}
- Favorable God: ${baziResult.favorableGod || ""}
- Unfavorable God: ${baziResult.avoidGod || ""}

【Yearly Fortune Information】
- Yearly Pillars: ${data.stem}${data.branch}
- Year: ${data.year}
- Age: ${data.age} years old
- Ten God: ${data.tenGod}

Please provide a concise Yearly Fortune interpretation (200-300 characters), including:
1. Yearly pillars and Day Master relationship
2. Annual fortune trends
3. Career, wealth, relationship, health predictions
4. Key advice

${langInstruction}`,
      ja: `あなたは中国伝統命理の達人です。「${cultureInfo.style}」を使って以下の流年を解読してください。
${cultureInfo.context}

【ユーザーの八字情報】
- 日主：${baziResult.dayStem}（${baziResult.dayMasterElement}${baziResult.dayMasterPolarity}）
- 命格：${baziResult.destinyPattern}
- 身強身弱：${baziResult.bodyStrengthLevel}
- 喜用神：${baziResult.favorableGod || ""}
- 忌神：${baziResult.avoidGod || ""}

【流年情報】
- 流年干支：${data.stem}${data.branch}
- 年：${data.year}年
- 年齢：${data.age}歳
- 十神：${data.tenGod}

簡潔な流年解読（200-300字）を提供してください：
1. 流年と日主の関係
2. 年間運勢特徴
3. 事業財運恋愛健康予測
4. 開運アドバイス

${langInstruction}`,
      ko: `당신은 중국 전통 명리의 대가입니다. "${cultureInfo.style}"을 사용하여 다음 세운을 해석해 주세요.
${cultureInfo.context}

【사용자 사주 정보】
- 일주：${baziResult.dayStem}（${baziResult.dayMasterElement}${baziResult.dayMasterPolarity}）
- 명격：${baziResult.destinyPattern}
- 신강신약：${baziResult.bodyStrengthLevel}
- 희용신：${baziResult.favorableGod || ""}
- 기신：${baziResult.avoidGod || ""}

【세운 정보】
- 세운 간지：${data.stem}${data.branch}
- 연도：${data.year}년
- 나이：${data.age}세
- 십신：${data.tenGod}

간결한 세운 해석（200-300자）을 제공해 주세요：
1. 세운과 일주 관계
2. 연간 운세 특징
3. 직업 재운 연애 건강 예측
4. 개운 조언

${langInstruction}`,
    };
  }

  const prompt = promptTemplateI18n[language] || promptTemplateI18n.zh;
  
  try {
    const ragContext = await buildRAGContext(
      type === "grandLuck" ? `大运解读 ${data.stem}${data.branch}` : `流年解读 ${data.year}`,
      { dayStem: baziResult.dayStem, favorableGods: baziResult.favorableGod ? [baziResult.favorableGod] : [] }
    );
    
    const systemPrompt = ragContext 
      ? `${getRAGSystemPrompt(language)}\n\n【命理协议】:\n${ragContext}`
      : undefined;
    
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = systemPrompt
      ? [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }]
      : [{ role: "user", content: prompt }];

    // Use higher max_tokens for thinking models (kimi-k2.5, kimi-k2-thinking) 
    // which consume tokens for internal reasoning before generating output
    const completion = await kimi.chat.completions.create({
      model: getKimiModel(subscriptionTier),
      messages,
      max_tokens: 4096,
    });

    const content = completion.choices[0]?.message?.content || "";
    
    // Log if content is empty for debugging
    if (!content) {
      console.warn(`Deep reading returned empty content for ${type}:`, {
        model: getKimiModel(subscriptionTier),
        finishReason: completion.choices[0]?.finish_reason,
        usage: completion.usage,
      });
    }
    
    // Enforce 200-300 character length limit (handles longer outputs from thinking models)
    return enforceInterpretationLength(content);
  } catch (error) {
    console.error("Deep reading generation error:", error);
    throw error;
  }
}

// Translate an array of short text labels (BaZi terms, elements, etc.)
export async function translateTexts(
  texts: string[],
  targetLanguage: string
): Promise<string[]> {
  if (!texts || texts.length === 0) return texts;
  if (targetLanguage === "zh") return texts; // Already in Chinese
  
  const langName = targetLanguage === "en" ? "English" : targetLanguage === "ja" ? "Japanese" : targetLanguage === "ko" ? "Korean" : "English";
  
  try {
    const prompt = `Translate the following Chinese fortune-telling/BaZi terms to ${langName}. These are short labels like element names, destiny patterns, or astrological terms. Keep translations concise and natural.

Terms to translate:
${JSON.stringify(texts)}

Return a JSON object with a "translations" array containing the translated strings in the same order. Example: {"translations": ["translated1", "translated2"]}`;

    const completion = await kimi.chat.completions.create({
      model: FAST_TRANSLATION_MODEL, // Use fast model for translations
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      response_format: { type: "json_object" },
    });
    
    const responseText = completion.choices[0]?.message?.content || "{}";
    try {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed.translations) && parsed.translations.length === texts.length) {
        return parsed.translations;
      }
    } catch {
      console.error("Failed to parse translation response");
    }
    
    return texts;
  } catch (error) {
    console.error("Text translation error:", error);
    return texts;
  }
}

// Generate multi-language interpretation JSON for instant language switching
export interface MultiLangInterpretation {
  zh: string;
  en: string;
  ja: string;
  ko: string;
}

// Generate interpretation in all 4 languages at once for instant switching
export async function generateMultiLangDeepReading(
  baziResult: BaziResult,
  type: "grandLuck" | "yearlyFortune" | string,
  data: any,
  culture: string = "none",
  subscriptionTier: string = "free"
): Promise<MultiLangInterpretation> {
  // Generate the Chinese version first (primary language)
  const zhContent = await generateDeepReading(baziResult, type, data, "zh", culture, subscriptionTier);
  
  // If no content, return empty multi-lang object
  if (!zhContent) {
    return { zh: "", en: "", ja: "", ko: "" };
  }
  
  // Translate to other languages using fast model
  try {
    const prompt = `将以下命理解读翻译成英语、日语和韩语。保持专业命理术语的准确性。

原文（中文）：
${zhContent}

请以JSON格式返回翻译结果：
{
  "en": "English translation...",
  "ja": "日本語翻訳...",
  "ko": "한국어 번역..."
}`;

    const completion = await kimi.chat.completions.create({
      model: FAST_TRANSLATION_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });
    
    const responseText = completion.choices[0]?.message?.content || "{}";
    try {
      const parsed = JSON.parse(responseText);
      // Apply length enforcement to all translations
      return {
        zh: zhContent, // Already enforced in generateDeepReading
        en: enforceInterpretationLength(parsed.en || zhContent),
        ja: enforceInterpretationLength(parsed.ja || zhContent),
        ko: enforceInterpretationLength(parsed.ko || zhContent),
      };
    } catch {
      console.error("Failed to parse multi-lang translation response");
      return { zh: zhContent, en: zhContent, ja: zhContent, ko: zhContent };
    }
  } catch (error) {
    console.error("Multi-lang translation error:", error);
    return { zh: zhContent, en: zhContent, ja: zhContent, ko: zhContent };
  }
}

// Fast translation function using moonshot-v1-8k for UI text translation
export async function fastTranslate(
  text: string,
  targetLanguage: string
): Promise<string> {
  if (!text || targetLanguage === "zh") return text;
  
  const langName = targetLanguage === "en" ? "English" : targetLanguage === "ja" ? "Japanese" : targetLanguage === "ko" ? "Korean" : "English";
  
  try {
    const completion = await kimi.chat.completions.create({
      model: FAST_TRANSLATION_MODEL,
      messages: [{ 
        role: "user", 
        content: `Translate to ${langName}. Keep fortune-telling terms accurate:\n\n${text}`
      }],
      max_tokens: 1000,
    });
    
    return completion.choices[0]?.message?.content || text;
  } catch (error) {
    console.error("Fast translation error:", error);
    return text;
  }
}
