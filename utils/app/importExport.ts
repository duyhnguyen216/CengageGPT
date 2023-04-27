import { Conversation } from '@/types/chat';
import { CosmosClient } from '@azure/cosmos';
import {
  ExportFormatV1,
  ExportFormatV2,
  ExportFormatV3,
  ExportFormatV4,
  LatestExportFormat,
  SupportedExportFormats,
} from '@/types/export';
import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';

import { cleanConversationHistory } from './clean';
import { fetchConstantValue } from './fetchConstant'

export function isExportFormatV1(obj: any): obj is ExportFormatV1 {
  return Array.isArray(obj);
}

export function isExportFormatV2(obj: any): obj is ExportFormatV2 {
  return !('version' in obj) && 'folders' in obj && 'history' in obj;
}

export function isExportFormatV3(obj: any): obj is ExportFormatV3 {
  return obj.version === 3;
}

export function isExportFormatV4(obj: any): obj is ExportFormatV4 {
  return obj.version === 4;
}

export const isLatestExportFormat = isExportFormatV4;

export function cleanData(data: SupportedExportFormats): LatestExportFormat {
  if (isExportFormatV1(data)) {
    return {
      version: 4,
      id: '',
      username: '',
      history: cleanConversationHistory(data),
      folders: [],
      prompts: [],
    };
  }

  if (isExportFormatV2(data)) {
    return {
      version: 4,
      id: '',
      username: '',
      history: cleanConversationHistory(data.history || []),
      folders: (data.folders || []).map((chatFolder) => ({
        id: chatFolder.id.toString(),
        name: chatFolder.name,
        type: 'chat',
      })),
      prompts: [],
    };
  }

  if (isExportFormatV3(data)) {
    return { ...data, version: 4, id: '', username: '', prompts: [] };
  }

  if (isExportFormatV4(data)) {
    return data;
  }

  throw new Error('Unsupported data format');
}

function currentDate() {
  const date = new Date();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}-${day}`;
}

//Get the full log in info from Azure Easy Auth use the first element in the return array
export async function getUserInfo() {
  try {
    const response = await fetch('/.auth/me');

    // Check if the response is ok (status code 200-299)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Handle any errors that occurred during the fetch or parsing process
    console.error('Error fetching data:', error);
  }
}

export const exportData = async (writeToDatabase = false) => {
  let history = localStorage.getItem('conversationHistory');
  let folders = localStorage.getItem('folders');
  let prompts = localStorage.getItem('prompts');
  let userInfo;

  try {
    userInfo = await getUserInfo();
  } catch (e) {

  }
  let username = 'local_user';
  if (userInfo != undefined && userInfo[0].user_id != undefined) {
    username = userInfo[0].user_id;
  }

  if (history) {
    history = JSON.parse(history);
  }

  if (folders) {
    folders = JSON.parse(folders);
  }

  if (prompts) {
    prompts = JSON.parse(prompts);
  }

  const data = {
    version: 4,
    id: '',
    username: username,
    history: history || [],
    folders: folders || [],
    prompts: prompts || [],
  } as LatestExportFormat;

  if (writeToDatabase) {

    //TODO implement error handling
    let endpoint = '', key = '', databaseId = '', containerId = '';
    await fetchConstantValue('DB_HOST').then(value => {
      endpoint = value;
    });
    await fetchConstantValue('DB_PASSWORD').then(value => {
      key = value;
    });
    await fetchConstantValue('DB_ID').then(value => {
      databaseId = value;
    });
    await fetchConstantValue('DB_CONTAINER_ID').then(value => {
      containerId = value;
    });

    const client = new CosmosClient({ endpoint, key });

    try {
      const { username } = data;
      // TODO this part can probably be refactored, combine with the function in Chatbar 
      const query = {
        query: "SELECT * FROM Conversations WHERE Conversations.username = @username",
        parameters: [
          { name: "@username", value: username }
        ]
      };

      const container = client.database(databaseId).container(containerId);
      const { resources: conversation } = await container.items.query(query).fetchAll();
      // If item exists, update it
      if (conversation && conversation[0]) {
        data.id = conversation[0].id;
        await container.item(conversation[0].id).replace(data);
      } else {
        await container.items.create(data);
      }
      //await container.item(username).replace(data);
    } catch (err: any) {
      if (err.code === 404) {
        // If item doesn't exist, insert it
        const container = client.database(databaseId).container(containerId);
        await container.items.create(data);
      } else {
        console.log(err);
        //res.status(500).send(err);
      }
    }
  }

  return JSON.stringify(data);
  // const blob = new Blob([JSON.stringify(data, null, 2)], {
  //   type: 'application/json',
  // });
  // const url = URL.createObjectURL(blob);
  // const link = document.createElement('a');
  // link.download = `chatbot_ui_history_${currentDate()}.json`;
  // link.href = url;
  // link.style.display = 'none';
  // document.body.appendChild(link);
  // link.click();
  // document.body.removeChild(link);
  // URL.revokeObjectURL(url);
};


// TODO: This should be deprecated once we have the db working
export const importData = (
  data: SupportedExportFormats,
): LatestExportFormat => {
  const { history, folders, prompts } = cleanData(data);

  const oldConversations = localStorage.getItem('conversationHistory');
  const oldConversationsParsed = oldConversations
    ? JSON.parse(oldConversations)
    : [];

  const newHistory: Conversation[] = [
    ...oldConversationsParsed,
    ...history,
  ].filter(
    (conversation, index, self) =>
      index === self.findIndex((c) => c.id === conversation.id),
  );
  localStorage.setItem('conversationHistory', JSON.stringify(newHistory));
  if (newHistory.length > 0) {
    localStorage.setItem(
      'selectedConversation',
      JSON.stringify(newHistory[newHistory.length - 1]),
    );
  } else {
    localStorage.removeItem('selectedConversation');
  }

  const oldFolders = localStorage.getItem('folders');
  const oldFoldersParsed = oldFolders ? JSON.parse(oldFolders) : [];
  const newFolders: FolderInterface[] = [
    ...oldFoldersParsed,
    ...folders,
  ].filter(
    (folder, index, self) =>
      index === self.findIndex((f) => f.id === folder.id),
  );
  localStorage.setItem('folders', JSON.stringify(newFolders));

  const oldPrompts = localStorage.getItem('prompts');
  const oldPromptsParsed = oldPrompts ? JSON.parse(oldPrompts) : [];
  const newPrompts: Prompt[] = [...oldPromptsParsed, ...prompts].filter(
    (prompt, index, self) =>
      index === self.findIndex((p) => p.id === prompt.id),
  );
  localStorage.setItem('prompts', JSON.stringify(newPrompts));

  return {
    version: 4,
    id: '',
    username: '',
    history: newHistory,
    folders: newFolders,
    prompts: newPrompts,
  };
};

