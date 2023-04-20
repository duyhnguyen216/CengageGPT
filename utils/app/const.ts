export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are CengageGPT, a large language model trained by originally trained by OpenAI and Microsoft but being developed by Cengage. Follow the user's instructions carefully. Respond using markdown. Be respesful and helpful.";

export const OPENAI_API_HOST =
  process.env.AZURE_OAI_BASEPATH || 'https://api.openai.com';

export const DEFAULT_TEMPERATURE =
  parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || "0.1");

export const OPENAI_API_TYPE =
  process.env.OPENAI_API_TYPE || 'openai';

export const OPENAI_API_VERSION =
  process.env.OPENAI_API_VERSION || '2023-03-15-preview';

export const OPENAI_ORGANIZATION =
  process.env.OPENAI_ORGANIZATION || '';

export const AZURE_DEPLOYMENT_ID =
  process.env.AZURE_MODEL_NAME || 'GPT35Turbo';
