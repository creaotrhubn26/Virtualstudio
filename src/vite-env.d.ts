/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_R2_ASSETS: string;
  readonly VITE_DATABASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
