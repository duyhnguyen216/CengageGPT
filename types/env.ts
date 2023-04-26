export interface ProcessEnv {
  OPENAI_API_KEY: string;
  OPENAI_API_HOST?: string;
  OPENAI_API_TYPE?: 'openai' | 'azure';
  OPENAI_API_VERSION?: string;
  OPENAI_ORGANIZATION?: string;
  DB_HOST?: string;
  DB_ID?: string;
  DB_KEY?: string;
  DB_CONTAINER_ID?: string;
}
