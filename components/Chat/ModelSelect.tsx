import { IconExternalLink } from '@tabler/icons-react';
import { useContext } from 'react';

import { useTranslation } from 'next-i18next';

import { OpenAIModel } from '@/types/openai';

import HomeContext from '@/pages/api/home/home.context';
import { Conversation, Message } from '@/types/chat';
import { Conversations } from '../Chatbar/components/Conversations';


interface Props {
  accountCost:number;
  conversations:Conversation[]
}
 const costStruct = {

 }

export const ModelSelect = ({accountCost, conversations}:Props) => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, models, defaultModelId},
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    selectedConversation &&
      handleUpdateConversation(selectedConversation, {
        key: 'model',
        value: models.find(
          (model) => model.id === e.target.value,
        ) as OpenAIModel,
      });
  };

  const getTokenCount = (contentEntries:Message[]):number => {
    let contentLengths = contentEntries.map(ce => ce.content.length).reduce((a, b) => a + b, 0)// get the total lengths of content
    return (contentLengths/1000) //TODO refactor using interfaces
  }

  // mode = input, if you want only input messages
  // mode = output if you want only output messages const
  //TODO refactor this to make it better, costs should go on the OpenAIModel interface
  const getCost = (messages: Message[], modelType:string, mode?:string):number => {
    let inputContent = messages.filter(m => m.role == 'user')// content the user has entered
    let outputContent = messages.filter(m => m.role == 'assistant')// content ChatGPT returns
    
    let promptCost, completionCost;
    if(modelType == 'GPT-4'){
      promptCost = 0.03
      completionCost = 0.06
    }
    else if(modelType == 'GPT-4-32K'){
      promptCost = 0.06
      completionCost = 0.12
    }
    else { // for the default mode
      promptCost = 0.002
      completionCost = 0.002
    }


    if(mode == 'input'){
      return getTokenCount(inputContent) * promptCost
    }
    else if(mode == 'output'){
      return getTokenCount(outputContent) * completionCost
    }
    else{// default
      return (getTokenCount(inputContent) * promptCost) + (getTokenCount(outputContent) * completionCost)
    }
  }

  const calculateUserCost = (convs:Conversation[], today?:Date):string => {
    let gpt35Cost:number = 0;
    let gpt4Cost:number = 0;
    // if (today){ // get today's messages
    //   messages = convs.filter(c => c.date == today.toISOString().split('T')[0])
    // }
    // else
    //   messages = convs.map(c => c.messages).flat()// get messages across entire conv history for a user
    let gpt35Messages = convs.filter(c => c.model.name == "GPT-3.5").map(m => m.messages).flat()
    let gpt4Messages = convs.filter(c => c.model.name == 'GPT-4').map(m => m.messages).flat()

    gpt35Cost  = gpt35Messages.length > 0 ? getCost(gpt35Messages, "GPT-3.5") : 0;
    gpt4Cost = gpt4Messages.length > 0 ? getCost(gpt4Messages, 'GPT-4') : 0

    return (gpt35Cost + gpt4Cost).toFixed(2)
  }

  let userCostTillDate = calculateUserCost(conversations);
  // let userCostCurrentSession = calculateCost(conversations, new Date())


  return (
    <div className="flex flex-col">
      <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
        {t('Model')}
      </label>
      <div className="w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
        <select
          className="w-full bg-transparent p-2"
          placeholder={t('Select a model') || ''}
          value={selectedConversation?.model?.id || defaultModelId}
          onChange={handleChange}
        >
          {models.map((model, index) => (
            <option
              key={model.id}
              value={model.id}
              className="dark:bg-[#343541] dark:text-white"
              disabled={index === models.length - 2}
            >
              {model.id === defaultModelId
                ? `Default (${model.name})`
                : model.name}
            </option>
          ))}
        </select>
      </div>
      <div className="w-full mt-3 text-left dark:text-neutral-400 flex items-center">
          <div>
          {`Your costs till date : $${userCostTillDate}`}
          </div>

      </div>
    </div>
  );
};
