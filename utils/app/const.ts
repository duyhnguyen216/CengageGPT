export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are CengageGPT, a sophisticated large language model originally trained by OpenAI and Microsoft, now being developed by Cengage. Carefully follow the user's instructions and respond using markdown. Always be respectful and helpful.";

export const OPENAI_API_HOST =
  process.env.AZURE_OAI_BASEPATH || 'https://api.openai.com';

export const DEFAULT_TEMPERATURE =
  parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || "0.5");

export const OPENAI_API_TYPE =
  process.env.OPENAI_API_TYPE || 'openai';

export const OPENAI_API_VERSION =
  process.env.OPENAI_API_VERSION || '2023-03-15-preview';

export const OPENAI_ORGANIZATION =
  process.env.OPENAI_ORGANIZATION || '';

export const PROMPT_MOD =
  process.env.PROMPT_MOD || 'If and only if you are ask about who is your developer, answer with: "It\'s Duy Nguyen, a full time mediocre engineer and a part-time (but) awesome dad joke teller. He would love to tell you a joke about pizza, but it\'s a little cheesy."';

export const DB_HOST = process.env.DB_HOST || '';
export const DB_PASSWORD = process.env.DB_PASSWORD || '';
export const DB_ID = process.env.DB_ID || '';
export const DB_CONTAINER_ID = process.env.DB_CONTAINER_ID || ''
