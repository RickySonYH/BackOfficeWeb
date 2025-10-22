/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ECP_AUTH_URL: string;
  readonly VITE_MONITORING_API_URL: string;
  // 다른 환경 변수들을 여기에 추가
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
