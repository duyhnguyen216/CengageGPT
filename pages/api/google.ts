import { NextApiRequest, NextApiResponse } from 'next';

import { OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION } from '@/utils/app/const';
import { cleanSourceText } from '@/utils/server/google';

import { Message } from '@/types/chat';
import { GoogleBody, GoogleSource } from '@/types/google';

import { Readability } from '@mozilla/readability';
import endent from 'endent';
import jsdom, { JSDOM } from 'jsdom';
import { OpenAIModelID } from '@/types/openai';
import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import fs from 'node:fs';

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  let encoding: Tiktoken | null = null;
  try {
    const { messages, key, model, googleAPIKey, googleCSEId } =
      req.body as GoogleBody;

    const userMessage = messages[messages.length - 1];
    const query = encodeURIComponent(userMessage.content.trim());

    const googleRes = await fetch(
      `https://customsearch.googleapis.com/customsearch/v1?key=${googleAPIKey ? googleAPIKey : process.env.GOOGLE_API_KEY
      }&cx=${googleCSEId ? googleCSEId : process.env.GOOGLE_CSE_ID
      }&q=${query}&num=3`,
    );

    const googleData = await googleRes.json();
    if (googleData.error) {
      const error = googleData.error;
      res.status(error.code).json({ error: "Google search error: " + error.message });
      return res;
    }
    const wasmBinary = fs.readFileSync(
      './node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm',
    );
    const wasmModule = await WebAssembly.compile(wasmBinary);
    await init((imports) => WebAssembly.instantiate(wasmModule, imports));
    encoding = new Tiktoken(
      tiktokenModel.bpe_ranks,
      tiktokenModel.special_tokens,
      tiktokenModel.pat_str,
    );

    const sources: GoogleSource[] = googleData.items.map((item: any) => ({
      title: item.title,
      link: item.link,
      displayLink: item.displayLink,
      snippet: item.snippet,
      //image: item.pagemap?.cse_image?.[0]?.src,
      text: '',
    }));

    const textDecoder = new TextDecoder();
    const sourcesWithText: any = await Promise.all(
      sources.map(async (source) => {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), 10000),
          );

          const res = (await Promise.race([
            fetch(source.link),
            timeoutPromise,
          ])) as any;

          // if (res) {
          const html = await res.text();

          const virtualConsole = new jsdom.VirtualConsole();
          virtualConsole.on('error', (error) => {
            if (!error.message.includes('Could not parse CSS stylesheet')) {
              console.error(error);
            }
          });

          const dom = new JSDOM(html, { virtualConsole });
          const doc = dom.window.document;
          const parsed = new Readability(doc).parse();

          if (parsed) {
            let sourceText = cleanSourceText(parsed.textContent);

            // 500 tokens per source
            let encodedText = encoding!.encode(sourceText);
            if (encodedText.length > 500) {
              encodedText = encodedText.slice(0, 500);
            }

            return {
              ...source,
              text: textDecoder.decode(encoding!.decode(encodedText)),
            } as GoogleSource;
          }
          // }

          return null;
        } catch (error) {
          console.error(error);
          return null;
        }
      }),
    );

    const filteredSources: GoogleSource[] = sourcesWithText.filter(Boolean);
    let sourceTexts: string[] = [];
    let tokenSizeTotal = 0;
    for (const source of filteredSources) {
      const text = endent`
      ${source.title} (${source.link}):
      ${source.text}
      `;
      const tokenSize = encoding.encode(text).length;
      if (tokenSizeTotal + tokenSize > 2000) {
        break;
      }
      sourceTexts.push(text);
      tokenSizeTotal += tokenSize;
    }

    const answerPrompt = endent`
    Provide me with the information I requested. Use the sources to provide an accurate response. Respond in markdown format. Cite the sources you used as a markdown link as you use them at the end of each sentence by number of the source (ex: [[1]](link.com)). Provide an accurate response and then stop. Today's date is ${new Date().toLocaleDateString()}. 

    Example Input:
    What's the weather in San Francisco today?

    Example Sources:
    [Weather in San Francisco](https://www.google.com/search?q=weather+san+francisco)

    Example Response:
    It's 70 degrees and sunny in San Francisco today. [[1]](https://www.google.com/search?q=weather+san+francisco)

    Input:
    ${userMessage.content.trim()}

    Sources:
    ${sourceTexts}

    Response:
    `;

    const answerMessage: Message = { role: 'user', content: answerPrompt };
    const modeID = model.id == 'GPT35Turbo' || OpenAIModelID.GPT_3_5_16K_AZ ? 'GPT35Turbo16K' : model.id;
    const url = `${OPENAI_API_HOST}/openai/deployments/${modeID}/chat/completions?api-version=${OPENAI_API_VERSION}`;
    const answerRes = await fetch(url, {
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
        model: model.id,
        messages: [
          {
            role: 'system',
            content: `Use the sources to provide an accurate response. Respond in markdown format. Cite the sources you used as [1](link), etc, as you use them. Maximum 5 sentences. If you can not answer, print out the sources that were given to you in markdown format with a small summary.`,
          },
          answerMessage,
        ],
        max_tokens: 2000,
        temperature: 1,
        stream: false,
      }),
    });

    const { choices: choices2 } = await answerRes.json();
    const answer = choices2[0].message.content;

    res.status(200).send(answer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error' });
  } finally {
    if (encoding !== null) {
      encoding.free();
    }
  }
};

export default handler;
