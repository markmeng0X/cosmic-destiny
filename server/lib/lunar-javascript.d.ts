declare module 'lunar-javascript' {
  export interface Solar {
    getLunar(): Lunar;
  }

  export interface Lunar {
    getEightChar(): EightChar;
  }

  export interface EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
  }

  interface SolarStatic {
    fromYmd(year: number, month: number, day: number): Solar;
    fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar;
  }

  interface LunarJavascript {
    Solar: SolarStatic;
    Lunar: typeof Lunar;
    EightChar: typeof EightChar;
  }

  const lunar: LunarJavascript;
  export default lunar;
}
