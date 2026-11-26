/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVICE_MODE?: 'mock' | 'http';
  readonly VITE_ALLOW_MOCK?: string;
  readonly VITE_ENABLE_SCENARIOS?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
