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

export interface MultimodalMessage {
  role: Role;
  content: ContentItem[];
  plugin?: PluginID;
}

export type ContentItem = 
  | TextContent
  | ImageContent;

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image_url";
  image_url: {
    url: string;
  };
}

export interface RequestBody {
  model: OpenAIModel;
  messages: MultimodalMessage[];
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
  images: string[] | undefined;
  model: OpenAIModel;
  prompt: string;
  temperature: number;
  folderId: string | null;
  time: number;
}
