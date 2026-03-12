/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EMAIL_API_URL: string;
  readonly VITE_EMAIL_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
