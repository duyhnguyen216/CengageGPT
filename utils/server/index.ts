import { Message } from '@/types/chat';
import { OpenAIModel, OpenAIModelID } from '@/types/openai';
import { Configuration, OpenAIApi } from "openai";

import { OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION, PROMPT_MOD } from '../app/const';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

export class OpenAIError extends Error {
  type: string;
  param: string;
  code: string;

  constructor(message: string, type: string, param: string, code: string) {
    super(message);
    this.name = 'OpenAIError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
};

let status = "";
let operationLocation = "";
let retryAfter = 0;

//Chat API call
export const OpenAIStream = async (
  model: OpenAIModel,
  systemPrompt: string,
  temperature: number,
  key: string,
  messages: Message[],
) => {
  let url = `${OPENAI_API_HOST}/v1/chat/completions`;
  if (model.id == OpenAIModelID.DALL_E) {
    const apiKey = process.env.AZURE_OPENAI_API_KEY || '';
    const headers: Headers = new Headers({
      "api-key": apiKey,
      "Content-Type": "application/json"
    });

    const caption = messages[messages.length - 1].content;
    const body = JSON.stringify({
      "caption": caption,
      "resolution": "1024x1024"
    });
    
    return generateImage(headers, body)
        .then(imageUrl => {
            console.log('Image URL:', imageUrl);
            return imageUrl; // return the process's result
        })
        .catch(err => {
            console.error('Error:', err);
            return err; 
        });
  } else if (OPENAI_API_TYPE === 'azure') {
    const modeID = model.id == OpenAIModelID.GPT_3_5 ? 'GPT35Turbo' : model.id;
    url = `${OPENAI_API_HOST}/openai/deployments/${modeID}/chat/completions?api-version=${OPENAI_API_VERSION}`;
  }

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(OPENAI_API_TYPE === 'openai' && {
        Authorization: `Bearer ${key ? key : process.env.AZURE_OPENAI_API_KEY}`
      }),
      ...(OPENAI_API_TYPE === 'azure' && {
        'api-key': `${key ? key : process.env.AZURE_OPENAI_API_KEY}`
      }),
      ...((OPENAI_API_TYPE === 'openai' && OPENAI_ORGANIZATION) && {
        'OpenAI-Organization': OPENAI_ORGANIZATION,
      }),
    },
    method: 'POST',
    body: JSON.stringify({
      ...(OPENAI_API_TYPE === 'openai' && { model: model.id }),
      messages: [
        {
          role: 'system',
          content: systemPrompt + PROMPT_MOD,
        },
        ...messages,
      ],
      max_tokens: 4000,
      temperature: temperature,
      stream: true,
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const result = await res.json();
    if (result.error) {
      throw new OpenAIError(
        result.error.message,
        result.error.type,
        result.error.param,
        result.error.code,
      );
    } else {
      throw new Error(
        `OpenAI API returned an error: ${decoder.decode(result?.value) || result.statusText
        }`,
      );
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data;

          try {
            const json = JSON.parse(data);
            if (json.choices[0].finish_reason != null) {
              controller.close();
              return;
            }
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);
      let lastChunk;
      for await (const chunk of res.body as any) {
        lastChunk = chunk;
        parser.feed(decoder.decode(chunk));
      }
      // TODO: Invest OPENAI BUG finish reason should be populated, 
      // but never in stream mode this is a work around
      lastChunk.choices[0].finish_reason = "DONE";
      parser.feed(decoder.decode(lastChunk));
    },
  });

  return stream;
};

function checkStatus(headers: Headers): Promise<string> {
  return new Promise((resolve, reject) => {
      fetch(operationLocation, { headers: headers })
          .then((response: Response) => response.json())
          .then((jsonResponse: any) => {
              const status = jsonResponse['status'];
              if (status !== "Succeeded" && status !== "Failed") {
                  setTimeout(() => resolve(checkStatus(headers)), retryAfter * 1000);
              } else {
                  if (status === "Failed") {
                    resolve('⚠️WARNING: ' + jsonResponse['error']['message']);
                  } else {
                    resolve(`![${jsonResponse['result']['caption']}](${jsonResponse['result']['contentUrl']})`);
                  }
              }
          })
          .catch((err: any) => {
              reject('An error occurred:' + err);
          });
  });
}

function generateImage(headers: Headers, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
      fetch("https://cengageai.openai.azure.com/dalle/text-to-image?api-version=2022-08-03-preview", {
          method: 'POST',
          headers: headers,
          body: body
      })
          .then((submission: Response) => {
              operationLocation = submission.headers.get('Operation-Location') || '';
              retryAfter = parseInt(submission.headers.get('Retry-after') || '0');
              resolve(checkStatus(headers));
          })
          .catch((err: any) => {
              reject('An error occurred:' + err);
          });
  });
}
