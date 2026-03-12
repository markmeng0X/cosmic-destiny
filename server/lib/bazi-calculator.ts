// BaZi Calculator using lunar-javascript library for accurate astronomical calculations
// This library handles solar terms, lunar calendar, and proper stem-branch calculations

import lunar from 'lunar-javascript';
const { Solar, Lunar, EightChar } = lunar;

const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const STEM_ELEMENTS: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水"
};

const STEM_POLARITY: Record<string, "阳" | "阴"> = {
  甲: "阳", 乙: "阴", 丙: "阳", 丁: "阴", 戊: "阳", 己: "阴", 庚: "阳", 辛: "阴", 壬: "阳", 癸: "阴"
};

const BRANCH_HIDDEN_STEMS: Record<string, { main: string; secondary?: string; residual?: string; percentages: number[] }> = {
  子: { main: "癸", percentages: [100] },
  丑: { main: "己", secondary: "癸", residual: "辛", percentages: [60, 30, 10] },
  寅: { main: "甲", secondary: "丙", residual: "戊", percentages: [60, 30, 10] },
  卯: { main: "乙", percentages: [100] },
  辰: { main: "戊", secondary: "乙", residual: "癸", percentages: [60, 30, 10] },
  巳: { main: "丙", secondary: "庚", residual: "戊", percentages: [60, 30, 10] },
  午: { main: "丁", secondary: "己", percentages: [70, 30] },
  未: { main: "己", secondary: "丁", residual: "乙", percentages: [60, 30, 10] },
  申: { main: "庚", secondary: "壬", residual: "戊", percentages: [60, 30, 10] },
  酉: { main: "辛", percentages: [100] },
  戌: { main: "戊", secondary: "辛", residual: "丁", percentages: [60, 30, 10] },
  亥: { main: "壬", secondary: "甲", percentages: [60, 40] },
};

export interface HiddenStemInfo {
  stem: string;
  tenGod: string;
  percentage: number;
}

export interface PillarInfo {
  stem: string;
  branch: string;
  stemTenGod: string;
  hiddenStems: HiddenStemInfo[];
}

export interface GrandLuckPeriod {
  startAge: number;
  endAge: number;
  stem: string;
  branch: string;
  hiddenStems: HiddenStemInfo[];
  startYear: number;
  endYear: number;
}

export interface YearlyFortune {
  year: number;
  age: number;
  stem: string;
  branch: string;
  tenGod: string;
}

export interface BaziResult {
  yearPillar?: PillarInfo;
  monthPillar?: PillarInfo;
  dayPillar?: PillarInfo;
  hourPillar?: PillarInfo;
  yearStem: string;
  yearBranch: string;
  monthStem: string;
  monthBranch: string;
  dayStem: string;
  dayBranch: string;
  hourStem: string;
  hourBranch: string;
  yearTenGod: string;
  monthTenGod: string;
  hourTenGod: string;
  dayMasterElement?: string;
  dayMasterPolarity?: string;
  dayMasterElementDesc?: string;
  favorableGod?: string;
  favorableGodDesc?: string;
  avoidGod?: string;
  avoidGodDesc?: string;
  grandLuck?: GrandLuckPeriod[];
  yearlyFortunes?: YearlyFortune[];
  fiveElements: Record<string, number>;
  tenGods: Record<string, number>;
  bodyStrength: number;
  bodyStrengthLevel: string;
  bodyStrengthDesc?: string;
  destinyPattern: string;
  destinyPatternDesc: string;
  birthYear?: number;
  gender?: string;
}

function getTenGod(dayStem: string, targetStem: string): string {
  const dayElement = STEM_ELEMENTS[dayStem];
  const dayPolarity = STEM_POLARITY[dayStem];
  const targetElement = STEM_ELEMENTS[targetStem];
  const targetPolarity = STEM_POLARITY[targetStem];
  
  const elements = ["木", "火", "土", "金", "水"];
  const dayIndex = elements.indexOf(dayElement);
  const targetIndex = elements.indexOf(targetElement);
  
  const relation = (targetIndex - dayIndex + 5) % 5;
  const samePolarity = dayPolarity === targetPolarity;
  
  const tenGods: Record<string, [string, string]> = {
    "0": ["比肩", "劫财"],
    "1": ["食神", "伤官"],
    "2": ["偏财", "正财"],
    "3": ["七杀", "正官"],
    "4": ["偏印", "正印"],
  };
  
  return tenGods[String(relation)][samePolarity ? 0 : 1];
}

function getHiddenStemsWithTenGods(branch: string, dayStem: string): HiddenStemInfo[] {
  const hidden = BRANCH_HIDDEN_STEMS[branch];
  if (!hidden) return [];
  
  const result: HiddenStemInfo[] = [];
  
  if (hidden.main) {
    result.push({
      stem: hidden.main,
      tenGod: getTenGod(dayStem, hidden.main),
      percentage: hidden.percentages[0],
    });
  }
  if (hidden.secondary) {
    result.push({
      stem: hidden.secondary,
      tenGod: getTenGod(dayStem, hidden.secondary),
      percentage: hidden.percentages[1],
    });
  }
  if (hidden.residual) {
    result.push({
      stem: hidden.residual,
      tenGod: getTenGod(dayStem, hidden.residual),
      percentage: hidden.percentages[2],
    });
  }
  
  return result;
}

function calculateBodyStrength(
  dayStem: string,
  pillars: { stem: string; branch: string }[]
): { score: number; level: string } {
  const dayElement = STEM_ELEMENTS[dayStem];
  let score = 0;
  
  const supportElements = getElementRelations(dayElement);
  
  pillars.forEach((pillar, index) => {
    const stemElement = STEM_ELEMENTS[pillar.stem];
    const hidden = BRANCH_HIDDEN_STEMS[pillar.branch];
    
    // Same element as day master - strong support
    if (stemElement === dayElement) {
      score += 1.5;
    }
    // Element that generates day master (印星)
    if (stemElement === supportElements.generating) {
      score += 1.2;
    }
    
    // Hidden stems support
    if (hidden) {
      const mainHiddenElement = STEM_ELEMENTS[hidden.main];
      if (mainHiddenElement === dayElement) {
        score += 1.0;
      }
      if (mainHiddenElement === supportElements.generating) {
        score += 0.8;
      }
      if (hidden.secondary && STEM_ELEMENTS[hidden.secondary] === dayElement) {
        score += 0.4;
      }
      if (hidden.residual && STEM_ELEMENTS[hidden.residual] === dayElement) {
        score += 0.2;
      }
    }
    
    // Month pillar (令) has extra weight
    if (index === 1) {
      const mainHiddenElement = hidden ? STEM_ELEMENTS[hidden.main] : null;
      if (mainHiddenElement === dayElement) {
        score += 1.5; // 得令 bonus
      }
    }
  });
  
  let level: string;
  if (score >= 8) level = "极度身强";
  else if (score >= 5) level = "身强";
  else if (score >= 3) level = "身中和";
  else if (score > 1) level = "身弱";
  else level = "极度身弱";
  
  return { score: Math.min(10, Math.max(0, score)), level };
}

function getElementRelations(element: string): { generating: string; generated: string; controlling: string; controlled: string } {
  const elements = ["木", "火", "土", "金", "水"];
  const idx = elements.indexOf(element);
  return {
    generating: elements[(idx + 4) % 5],  // Element that generates this (印)
    generated: elements[(idx + 1) % 5],   // Element this generates (食伤)
    controlling: elements[(idx + 3) % 5], // Element that controls this (官杀)
    controlled: elements[(idx + 2) % 5],  // Element this controls (财)
  };
}

function countFiveElements(pillars: { stem: string; branch: string }[]): Record<string, number> {
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  
  pillars.forEach((pillar) => {
    if (STEM_ELEMENTS[pillar.stem]) {
      counts[STEM_ELEMENTS[pillar.stem]]++;
    }
    const hidden = BRANCH_HIDDEN_STEMS[pillar.branch];
    if (hidden && STEM_ELEMENTS[hidden.main]) {
      counts[STEM_ELEMENTS[hidden.main]]++;
    }
  });
  
  return counts;
}

function determineDestinyPattern(tenGods: Record<string, number>): { pattern: string; desc: string } {
  const patterns: Record<string, string> = {
    正财格: "稳定、务实、财富。正财为用，主为人勤劳务实，善于积累财富。",
    偏财格: "灵活、机敏、机遇。偏财为用，主人善于把握机会，财运亨通。",
    正官格: "权力、责任、约束。正官为用，主为人正直守礼，适合从政或管理。",
    七杀格: "激进、竞争、突破。七杀为用，主人勇于挑战，善于开拓。",
    正印格: "知识、保护、传承。正印为用，主人好学上进，有贵人扶持。",
    偏印格: "创意、特殊、非传统。偏印为用，主人独立思考，善于创新。",
    食神格: "表达、创意、享受。食神为用，主人才华横溢，生活有品味。",
    伤官格: "才华、反叛、冲突。伤官为用，主人才情过人，不受拘束。",
    比肩格: "竞争、合作、支持。比肩为用，主人适合与人合作，互相扶持。",
    劫财格: "变化、挑战、失去。劫财为用，主人需防财务波动，宜守不宜攻。",
  };
  
  let maxGod = "正官";
  let maxCount = 0;
  
  Object.entries(tenGods).forEach(([god, count]) => {
    if (count > maxCount && god !== "日主") {
      maxCount = count;
      maxGod = god;
    }
  });
  
  const pattern = `${maxGod}格`;
  const desc = patterns[pattern] || "综合命格，需详细分析八字整体配合。";
  
  return { pattern, desc };
}

const ELEMENT_DESCRIPTIONS: Record<string, string> = {
  木: "木主仁，代表生发、成长。性格仁慈宽厚，积极向上，富有创造力和生命力。木旺之人，心地善良，乐于助人，具有领导才能。",
  火: "火主礼，代表热情、光明。性格热情开朗，积极进取，具有领导力和感染力。火旺之人，热情奔放，善于表达，富有创意。",
  土: "土主信，代表稳定、承载。性格诚实守信，踏实稳重，具有包容心和责任感。土旺之人，稳重可靠，待人真诚，适合中介协调。",
  金: "金主义，代表收敛、坚韧。性格坚毅果断，原则性强，具有决断力和执行力。金旺之人，正义凛然，言出必行，适合技术专业。",
  水: "水主智，代表智慧、流动。性格聪明机智，善于变通，具有洞察力和适应力。水旺之人，机智灵活，善于应变，适合谋略策划。",
};

const BODY_STRENGTH_DESCRIPTIONS: Record<string, string> = {
  极度身强: "日主能量极强，需要克制和发泄，适合担当重任，开拓进取。宜用食伤泄秀、财星耗身，忌印比生扶。事业上可独当一面，但需注意人际关系。",
  身强: "日主能量充足，自信有主见，适合独立发展。宜用财官，忌印比过重。事业上有主导能力，宜把握机会积极进取。",
  身中和: "日主能量平衡，性格中庸稳健，适应力强。喜用神需根据具体情况而定，整体运势较为平稳。",
  身弱: "日主能量不足，需要生扶帮助，适合合作发展。宜用印比，忌财官克泄。事业上宜稳扎稳打，借助贵人相助。",
  极度身弱: "日主能量极弱，需要强力生扶。宜用印比生助，大忌财官七杀。需谨慎行事，多积累实力，待时而动。",
};

function determineFavorableGods(
  dayStem: string,
  bodyStrengthLevel: string
): { favorable: string; favorableDesc: string; avoid: string; avoidDesc: string } {
  const dayElement = STEM_ELEMENTS[dayStem];
  const elements = ["木", "火", "土", "金", "水"];
  const dayIndex = elements.indexOf(dayElement);
  
  const supportElements = [elements[dayIndex], elements[(dayIndex + 4) % 5]];
  const restrainElements = [elements[(dayIndex + 2) % 5], elements[(dayIndex + 3) % 5]];
  const drainElement = elements[(dayIndex + 1) % 5];
  
  const isStrong = bodyStrengthLevel.includes("身强");
  const isWeak = bodyStrengthLevel.includes("身弱");
  
  let favorable: string;
  let favorableDesc: string;
  let avoid: string;
  let avoidDesc: string;
  
  if (isStrong) {
    favorable = `${restrainElements[0]}${restrainElements[1]}`;
    favorableDesc = `身强宜用财官。${restrainElements[0]}为财星，可耗身生财；${restrainElements[1]}为官杀，可约束规范。${drainElement}为食伤，可泄秀生财。事业上宜主动出击，财运方面可适当投资。`;
    avoid = supportElements.join("");
    avoidDesc = `身强忌印比。${supportElements[1]}为印星，会使日主更强；${supportElements[0]}为比劫，加重身旺之势。过旺则易刚愎自用，需谦虚待人。`;
  } else if (isWeak) {
    favorable = supportElements.join("");
    favorableDesc = `身弱宜用印比。${supportElements[1]}为印星，可生扶日主，增添实力；${supportElements[0]}为比劫，可帮身助力。事业上宜稳健发展，多借助团队和贵人。`;
    avoid = `${restrainElements[0]}${restrainElements[1]}`;
    avoidDesc = `身弱忌财官。${restrainElements[0]}为财星，耗泄日主精力；${restrainElements[1]}为官杀，克制日主。宜避免过度消耗，保存实力。`;
  } else {
    favorable = `${drainElement}${restrainElements[0]}`;
    favorableDesc = `身中和取平衡。${drainElement}为食伤，可适度泄秀展才华；${restrainElements[0]}为财星，可调节五行增财运。根据流年大运灵活调整。`;
    avoid = "无明显忌神";
    avoidDesc = "身中和者忌神不明显，但仍需根据大运流年调整。保持平衡发展，避免极端。";
  }
  
  return { favorable, favorableDesc, avoid, avoidDesc };
}

function calculateGrandLuck(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  birthHour: number,
  gender: string,
  dayStem: string
): GrandLuckPeriod[] {
  try {
    // Use lunar-javascript's built-in accurate grand luck calculation
    const solar = Solar.fromYmdHms(birthYear, birthMonth, birthDay, birthHour, 0, 0);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();
    
    // gender: 1 = male, 0 = female; sect: 1 = standard calculation method
    const genderCode = gender === "male" ? 1 : 0;
    // Use type assertion as the TypeScript types don't include getYun but it exists at runtime
    const yun = (eightChar as any).getYun(genderCode, 1);
    
    // Get 8 periods of grand luck (大运)
    const daYunList = yun.getDaYun(9); // Get 9 periods (first one is current, then 8 more)
    
    const grandLuck: GrandLuckPeriod[] = [];
    
    // Skip the first item (index 0) as it represents the current period before first grand luck
    for (let i = 1; i < daYunList.length && grandLuck.length < 8; i++) {
      const daYun = daYunList[i];
      const ganZhi = daYun.getGanZhi();
      const stem = ganZhi.charAt(0);
      const branch = ganZhi.charAt(1);
      const startAge = daYun.getStartAge();
      const endAge = daYun.getEndAge();
      const startYear = daYun.getStartYear();
      const endYear = daYun.getEndYear();
      
      grandLuck.push({
        startAge,
        endAge,
        stem,
        branch,
        hiddenStems: getHiddenStemsWithTenGods(branch, dayStem),
        startYear,
        endYear,
      });
    }
    
    return grandLuck;
  } catch (error) {
    console.error("Error calculating grand luck with lunar-javascript:", error);
    // Fallback to simple calculation if library fails
    return calculateGrandLuckFallback(birthYear, gender, dayStem);
  }
}

// Fallback calculation in case the library method fails
function calculateGrandLuckFallback(
  birthYear: number,
  gender: string,
  dayStem: string
): GrandLuckPeriod[] {
  // Get month pillar from EightChar for fallback
  const solar = Solar.fromYmd(birthYear, 6, 15);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  const monthGanZhi = eightChar.getMonth();
  const monthStem = monthGanZhi.charAt(0);
  const monthBranch = monthGanZhi.charAt(1);
  
  const yearStemIndex = (birthYear - 4) % 10;
  const yearPolarity = yearStemIndex % 2 === 0 ? "阳" : "阴";
  const isForward = (gender === "male" && yearPolarity === "阳") || 
                   (gender === "female" && yearPolarity === "阴");
  
  const monthStemIndex = HEAVENLY_STEMS.indexOf(monthStem);
  const monthBranchIndex = EARTHLY_BRANCHES.indexOf(monthBranch);
  
  const grandLuck: GrandLuckPeriod[] = [];
  const startAge = 3; // Default fallback start age
  
  for (let i = 0; i < 8; i++) {
    const offset = isForward ? i + 1 : -(i + 1);
    const stemIndex = (monthStemIndex + offset + 100) % 10;
    const branchIndex = (monthBranchIndex + offset + 120) % 12;
    const stem = HEAVENLY_STEMS[stemIndex];
    const branch = EARTHLY_BRANCHES[branchIndex];
    
    const periodStartAge = startAge + i * 10;
    const periodEndAge = periodStartAge + 9;
    const periodStartYear = birthYear + periodStartAge;
    const periodEndYear = birthYear + periodEndAge;
    
    grandLuck.push({
      startAge: periodStartAge,
      endAge: periodEndAge,
      stem,
      branch,
      hiddenStems: getHiddenStemsWithTenGods(branch, dayStem),
      startYear: periodStartYear,
      endYear: periodEndYear,
    });
  }
  
  return grandLuck;
}

function calculateYearlyFortunes(
  birthYear: number,
  dayStem: string,
  startYear: number,
  count: number = 10
): YearlyFortune[] {
  const fortunes: YearlyFortune[] = [];
  
  for (let i = 0; i < count; i++) {
    const year = startYear + i;
    // Use lunar-javascript for accurate year pillar
    try {
      const solar = Solar.fromYmd(year, 6, 15); // Mid-year reference
      const lunar = solar.getLunar();
      const eightChar = lunar.getEightChar();
      const yearGanZhi = eightChar.getYear();
      const yearStem = yearGanZhi.charAt(0);
      const yearBranch = yearGanZhi.charAt(1);
      const age = year - birthYear;
      
      fortunes.push({
        year,
        age,
        stem: yearStem,
        branch: yearBranch,
        tenGod: getTenGod(dayStem, yearStem),
      });
    } catch (e) {
      // Fallback calculation
      const stemIndex = (year - 4) % 10;
      const branchIndex = (year - 4) % 12;
      const age = year - birthYear;
      
      fortunes.push({
        year,
        age,
        stem: HEAVENLY_STEMS[stemIndex],
        branch: EARTHLY_BRANCHES[branchIndex],
        tenGod: getTenGod(dayStem, HEAVENLY_STEMS[stemIndex]),
      });
    }
  }
  
  return fortunes;
}

export function calculateBazi(
  birthDate: Date,
  birthHour: number,
  gender: string = "male",
  latitude?: number,
  longitude?: number
): BaziResult {
  const year = birthDate.getFullYear();
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();
  
  // Use lunar-javascript for accurate BaZi calculation
  // This library properly handles solar terms for month pillar
  let yearStem: string, yearBranch: string;
  let monthStem: string, monthBranch: string;
  let dayStem: string, dayBranch: string;
  let hourStem: string, hourBranch: string;
  
  try {
    const solar = Solar.fromYmdHms(year, month, day, birthHour, 0, 0);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();
    
    // Get the four pillars from lunar-javascript
    const yearGanZhi = eightChar.getYear();
    const monthGanZhi = eightChar.getMonth();
    const dayGanZhi = eightChar.getDay();
    const hourGanZhi = eightChar.getTime();
    
    yearStem = yearGanZhi.charAt(0);
    yearBranch = yearGanZhi.charAt(1);
    monthStem = monthGanZhi.charAt(0);
    monthBranch = monthGanZhi.charAt(1);
    dayStem = dayGanZhi.charAt(0);
    dayBranch = dayGanZhi.charAt(1);
    hourStem = hourGanZhi.charAt(0);
    hourBranch = hourGanZhi.charAt(1);
    
  } catch (error) {
    console.error("lunar-javascript calculation error, using fallback:", error);
    // Fallback to basic calculation if library fails
    const fallbackResult = calculateBaziFallback(birthDate, birthHour);
    yearStem = fallbackResult.yearStem;
    yearBranch = fallbackResult.yearBranch;
    monthStem = fallbackResult.monthStem;
    monthBranch = fallbackResult.monthBranch;
    dayStem = fallbackResult.dayStem;
    dayBranch = fallbackResult.dayBranch;
    hourStem = fallbackResult.hourStem;
    hourBranch = fallbackResult.hourBranch;
  }
  
  const pillars = [
    { stem: yearStem, branch: yearBranch },
    { stem: monthStem, branch: monthBranch },
    { stem: dayStem, branch: dayBranch },
    { stem: hourStem, branch: hourBranch },
  ];
  
  const yearTenGod = getTenGod(dayStem, yearStem);
  const monthTenGod = getTenGod(dayStem, monthStem);
  const hourTenGod = getTenGod(dayStem, hourStem);
  
  const yearPillar: PillarInfo = {
    stem: yearStem,
    branch: yearBranch,
    stemTenGod: yearTenGod,
    hiddenStems: getHiddenStemsWithTenGods(yearBranch, dayStem),
  };
  
  const monthPillar: PillarInfo = {
    stem: monthStem,
    branch: monthBranch,
    stemTenGod: monthTenGod,
    hiddenStems: getHiddenStemsWithTenGods(monthBranch, dayStem),
  };
  
  const dayPillar: PillarInfo = {
    stem: dayStem,
    branch: dayBranch,
    stemTenGod: "日主",
    hiddenStems: getHiddenStemsWithTenGods(dayBranch, dayStem),
  };
  
  const hourPillar: PillarInfo = {
    stem: hourStem,
    branch: hourBranch,
    stemTenGod: hourTenGod,
    hiddenStems: getHiddenStemsWithTenGods(hourBranch, dayStem),
  };
  
  const tenGods: Record<string, number> = {
    正财: 0, 偏财: 0, 正官: 0, 七杀: 0, 正印: 0, 偏印: 0, 食神: 0, 伤官: 0, 比肩: 0, 劫财: 0
  };
  tenGods[yearTenGod]++;
  tenGods[monthTenGod]++;
  tenGods[hourTenGod]++;
  
  // Count hidden stems' ten gods
  [yearPillar, monthPillar, dayPillar, hourPillar].forEach(pillar => {
    pillar.hiddenStems.forEach(hs => {
      if (tenGods[hs.tenGod] !== undefined) {
        tenGods[hs.tenGod] += hs.percentage / 100;
      }
    });
  });
  
  const fiveElements = countFiveElements(pillars);
  const { score, level } = calculateBodyStrength(dayStem, pillars);
  const { pattern, desc } = determineDestinyPattern(tenGods);
  
  const dayMasterElement = STEM_ELEMENTS[dayStem];
  const dayMasterPolarity = STEM_POLARITY[dayStem];
  const dayMasterElementDesc = ELEMENT_DESCRIPTIONS[dayMasterElement];
  
  const { favorable, favorableDesc, avoid, avoidDesc } = determineFavorableGods(dayStem, level);
  
  const grandLuck = calculateGrandLuck(year, month, day, birthHour, gender, dayStem);
  
  const currentYear = new Date().getFullYear();
  const yearlyFortunes = calculateYearlyFortunes(year, dayStem, currentYear, 10);
  
  const bodyStrengthDesc = BODY_STRENGTH_DESCRIPTIONS[level] || "";
  
  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    yearStem,
    yearBranch,
    monthStem,
    monthBranch,
    dayStem,
    dayBranch,
    hourStem,
    hourBranch,
    yearTenGod,
    monthTenGod,
    hourTenGod,
    dayMasterElement,
    dayMasterPolarity,
    dayMasterElementDesc,
    favorableGod: favorable,
    favorableGodDesc: favorableDesc,
    avoidGod: avoid,
    avoidGodDesc: avoidDesc,
    grandLuck,
    yearlyFortunes,
    fiveElements,
    tenGods,
    bodyStrength: Math.round(score * 10) / 10,
    bodyStrengthLevel: level,
    bodyStrengthDesc,
    destinyPattern: pattern,
    destinyPatternDesc: desc,
    birthYear: year,
    gender,
  };
}

// Fallback calculation if lunar-javascript fails
function calculateBaziFallback(birthDate: Date, birthHour: number): {
  yearStem: string; yearBranch: string;
  monthStem: string; monthBranch: string;
  dayStem: string; dayBranch: string;
  hourStem: string; hourBranch: string;
} {
  const year = birthDate.getFullYear();
  const month = birthDate.getMonth() + 1;
  
  // Year pillar
  const yearStemIndex = (year - 4) % 10;
  const yearBranchIndex = (year - 4) % 12;
  const yearStem = HEAVENLY_STEMS[yearStemIndex];
  const yearBranch = EARTHLY_BRANCHES[yearBranchIndex];
  
  // Month pillar (simplified - doesn't account for solar terms)
  const monthBranchIndex = (month + 1) % 12;
  const monthStemIndex = (yearStemIndex * 2 + month) % 10;
  const monthStem = HEAVENLY_STEMS[monthStemIndex];
  const monthBranch = EARTHLY_BRANCHES[monthBranchIndex];
  
  // Day pillar
  const baseDate = new Date(1900, 0, 31);
  const diffDays = Math.floor((birthDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const dayStemIndex = (diffDays + 10) % 10;
  const dayBranchIndex = diffDays % 12;
  const dayStem = HEAVENLY_STEMS[dayStemIndex >= 0 ? dayStemIndex : dayStemIndex + 10];
  const dayBranch = EARTHLY_BRANCHES[dayBranchIndex >= 0 ? dayBranchIndex : dayBranchIndex + 12];
  
  // Hour pillar
  let hourBranchIndex = Math.floor(((birthHour + 1) % 24) / 2);
  if (hourBranchIndex >= 12) hourBranchIndex = 0;
  const dayStemIndex2 = HEAVENLY_STEMS.indexOf(dayStem);
  const hourStemIndex = ((dayStemIndex2 % 5) * 2 + hourBranchIndex) % 10;
  const hourStem = HEAVENLY_STEMS[hourStemIndex];
  const hourBranch = EARTHLY_BRANCHES[hourBranchIndex];
  
  return {
    yearStem, yearBranch,
    monthStem, monthBranch,
    dayStem, dayBranch,
    hourStem, hourBranch,
  };
}

export function getHourBranchFromTime(timeString: string): number {
  const hourMap: Record<string, number> = {
    zi: 0, chou: 2, yin: 4, mao: 6, chen: 8, si: 10,
    wu: 12, wei: 14, shen: 16, you: 18, xu: 20, hai: 22
  };
  return hourMap[timeString] || 12;
}
