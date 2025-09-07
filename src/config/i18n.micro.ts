type Dict = Record<string, string>;

function interpolate(tpl: string, data?: Record<string, unknown>): string {
  if (!data) return tpl;
  return tpl.replace(/\$\{(\w+)\}/g, (_, k) => String((data as any)[k] ?? ''));
}

export class MicroI18n {
  private repo: Record<string, Dict> = {};
  private defaultLanguage: string;
  constructor(opts?: { defaultLanguage?: string }) {
    this.defaultLanguage = opts?.defaultLanguage ?? 'en';
  }
  loadLocale(lang: string, table: Dict) {
    this.repo[lang.toLowerCase()] = { ...(this.repo[lang.toLowerCase()] || {}), ...table };
  }
  middleware() {
    return async (ctx: any, next: any) => {
      const lang = (ctx.from?.language_code as string | undefined)?.toLowerCase() || this.defaultLanguage;
      const dict = this.repo[lang] || this.repo[this.defaultLanguage] || {};
      ctx.i18n = {
        t: (key: string, data?: Record<string, unknown>) => interpolate(dict[key] ?? key, data),
        locale: () => lang,
      };
      await next();
    };
  }
}

