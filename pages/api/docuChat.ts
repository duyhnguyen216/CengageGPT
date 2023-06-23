import { NextApiRequest, NextApiResponse } from 'next';

import { ChatBody, Message } from '@/types/chat';

import { OpenAIModelID } from '@/types/openai';
import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import fs from 'node:fs';
import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanChatMessage, SystemChatMessage, BaseChatMessage, AIChatMessage } from "langchain/schema";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { Document } from "langchain/document";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import {
    JSONLoader,
    JSONLinesLoader,
} from "langchain/document_loaders/fs/json";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { ChainTool } from "langchain/tools";
import { Calculator } from "langchain/tools/calculator";
import { VectorDBQAChain } from "langchain/chains";

import { TokenTextSplitter } from 'langchain/text_splitter';
import path from 'node:path';

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
    let encoding: Tiktoken | null = null;
    try {
        const { messages, model, temperature, sasToken, username } =
            req.body as ChatBody;

        const userMessage = messages[messages.length - 1];

        const chatMessages = convertMessagesToBaseChatMessages(messages);

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


        const modeID = model.id == OpenAIModelID.GPT_3_5 ? 'GPT35Turbo' : model.id;

        const chat = new ChatOpenAI({
            temperature: temperature,
            modelName: modeID,
            streaming: true,
            maxTokens: 4000,
        });

        const memory = new BufferMemory({
            chatHistory: new ChatMessageHistory(chatMessages),
            returnMessages: true,
            memoryKey: "chat_history",
        });

        // Create docs with a loader
        const splitter = new TokenTextSplitter({
            encodingName: "gpt2",
            chunkSize: 750,
            chunkOverlap: 50,
        });

        // Define the loaders
        type LoaderFunctions = {
            [extension: string]: (blob: Blob) => any;
        };
        const loaders: LoaderFunctions = {
            ".json": (blob: Blob) => new JSONLoader(blob, "/texts"),
            ".jsonl": (blob: Blob) => new JSONLinesLoader(blob, "/html"),
            ".txt": (blob: Blob) => new TextLoader(blob),
            //".csv": (blob: Blob) => new CSVLoader(blob, "text"),
            ".docx": (blob: Blob) => new DocxLoader(blob),
            ".doc": (blob: Blob) => new DocxLoader(blob),
            ".pdf": (blob: Blob) => new PDFLoader(blob),
        };


        // Iterate over the array and create each file in the new directory
        const files = await getUserFiles(username, sasToken);
        const splittedDoc : Document[] = [];
        const tools: ChainTool[] = [];
        for (const [file, blob] of files.entries()) {
            const fileExtension = path.extname(file);

            // Check if we have a loader for this file type
            if (fileExtension && loaders[fileExtension]) {
                // Load the file using the appropriate loader
                const loader = loaders[fileExtension];
                const output = await loader(blob).loadAndSplit(splitter);
                if (output.length != 0) {
                    output.metadata = { ...output.metadata, title: file };
                    splittedDoc.push(...output);

                    //CREATE A TOOL FOR EACH FILE
                    // let embeddings = new OpenAIEmbeddings();
                    // embeddings.azureOpenAIApiVersion = '2023-05-15';
                    // let vectorStore = await MemoryVectorStore.fromTexts([output[0].pageContent], output[0].metadata, embeddings);
                    // for (let i = 1; i < output.length; i++) {
                    //     vectorStore.addDocuments([output[i]]);
                    // }

                    // const summary = await chat.call([new HumanChatMessage('provide a brief summary of this text below and what is it purpose : ' + output[0].pageContent)]);
                    // const chain = VectorDBQAChain.fromLLM(chat, vectorStore);
                    // chain.k = 3;
                    // tools.push(new ChainTool({
                    //     name: path.basename(file),
                    //     description: summary.text,
                    //     chain: chain,
                    // }));
                }

            } else {
                console.warn(`No loader defined for file type ${fileExtension}`);
            }
        }

        //AGENT
        // const executor = await initializeAgentExecutorWithOptions(tools, chat, {
        //     agentType: "chat-conversational-react-description",
        //     memory : memory,
        // });
        // const agentResponse = await executor.call({ input: userMessage.content });
        //res.status(200).send(agentResponse.output);


        //REGULAR EMBEDDINGS USE FOR CHAIN
        let embeddings = new OpenAIEmbeddings();
        embeddings.azureOpenAIApiVersion = '2023-05-15';
        let vectorStore = await MemoryVectorStore.fromTexts([splittedDoc[0].pageContent], splittedDoc[0].metadata, embeddings);
        //work around since Azure does not support multiple Document embedding in one api call yet
        for (let i = 1; i < splittedDoc.length; i++) {
            vectorStore.addDocuments([splittedDoc[i]]);
        }
        const chain = ConversationalRetrievalQAChain.fromLLM(
            chat,
            vectorStore.asRetriever(),
            {
                memory: memory,
            },
        );
        
        //CHAIN
        const response = await chain.call({ question: userMessage.content });
        res.status(200).send(response.text);
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

function convertMessageToBaseChatMessage(message: Message): BaseChatMessage {
    if (message.role == 'system') {
        return new SystemChatMessage(message.content);
    }
    return message.role == 'user' ? new HumanChatMessage(message.content) : new AIChatMessage(message.content);
}

function convertMessagesToBaseChatMessages(messages: Message[]): BaseChatMessage[] {
    return messages.map(convertMessageToBaseChatMessage);
}

import { BlobServiceClient, AnonymousCredential, newPipeline } from "@azure/storage-blob";

async function getUserFiles(userID: string, sasToken: string) {
    const storageAccount = 'cengageai'; // Azure storage account name
    const containerName = 'cengagegpt-docs'; // Blob container name

    const pipeline = newPipeline(new AnonymousCredential());
    const blobServiceClient = new BlobServiceClient(
        `https://${storageAccount}.blob.core.windows.net?${sasToken}`,
        pipeline
    );

    const containerClient = blobServiceClient.getContainerClient(containerName);

    let blobs = containerClient.listBlobsFlat({ prefix: userID });
    let ret = new Map<string, Blob>();
    //let files = [];
    for await (const blob of blobs) {
        console.log(`Name: ${blob.name}  Size: ${blob.properties.contentLength}`);

        const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
        const downloadBlockBlobResponse = await blockBlobClient.download(0);

        if (downloadBlockBlobResponse.readableStreamBody) {
            const blobArrayBuffer = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
            // // Convert the ArrayBuffer to a Base64 string
            // const fileData = Buffer.from(blobArrayBuffer).toString('base64');
            // const fileName = blob.name.split("/").pop() || "";

            // files.push({ fileData, fileName });
            ret.set(blob.name, new Blob([blobArrayBuffer]));
        }
    }
    //return files;
    return ret;
}



async function streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        readableStream.on("data", (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on("error", reject);
    });
}

