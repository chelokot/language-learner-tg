export declare global {
  // biome-ignore lint/style/noNamespace: <explanation>
  namespace NodeJS {
    interface ProcessEnv {
      TOKEN: string;
      DATABASE_URL: string;
    }
  }
}
