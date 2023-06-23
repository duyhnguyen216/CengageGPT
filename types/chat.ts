import { OpenAIModel } from './openai';
import { PluginID } from './plugin';

export interface Message {
  role: Role;
  content: string;
  plugin?: PluginID;
}

export type Role = 'assistant' | 'user' | 'system';

export interface ChatBody {
  model: OpenAIModel;
  messages: Message[];
  key: string;
  prompt: string;
  temperature: number;
  sasToken: string;
  username: string;
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  model: OpenAIModel;
  prompt: string;
  temperature: number;
  folderId: string | null;
  time: number;
}
