# CengageGPT

This project leverages Azure OpenAI Service to create an enhanced ChatGPT like experience tailored for Cengage. Follow the instructions below to set up and run the project locally.

## Getting Started

### Prerequisites
Ensure you have the following installed on your machine:
- Node.js
- npm (Node package manager)

### Clone the Repository
Begin by cloning the repository to your local machine:
```bash
git clone <repository_url>
cd <repository_folder>
```

### Install Dependencies
Once inside the project directory, install the necessary dependencies by running:
```bash
npm install
```

### Configuration
You need to provide the required configuration details. Create a `.env` file in the root of the repo and add your OpenAI API Key and other necessary environment variables. Below is an example of what your `.env` file should look like:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_API_TYPE=azure
DB_NAME=chatGPTCengage
AZURE_OAI_BASEPATH=https://your_azure_openai_basepath
AZURE_INSTANCE_NAME=cengageai
AZURE_MODEL_NAME=your_azure_model_name
OPENAI_API_VERSION=your_openai_api_version
DB_PASSWORD=your_db_password
DB_CONTAINER_ID=Conversations
DB_ID=Conversations
DB_HOST=https://your_db_host:443/
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_API_INSTANCE_NAME=cengageai
AZURE_OPENAI_API_DEPLOYMENT_NAME=your_azure_openai_api_deployment_name
AZURE_OPENAI_API_VERSION=your_azure_openai_api_version
AZURE_STORAGE_ACCOUNT_NAME=your_azure_storage_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_azure_storage_account_key
AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME=your_azure_openai_api_embeddings_deployment_name
```
> **Note:** Replace `your_openai_api_key`, `your_azure_openai_basepath`, `your_azure_model_name`, `your_openai_api_version`, `your_db_password`, `your_db_host`, `your_azure_openai_api_key`, `your_azure_openai_api_deployment_name`, `your_azure_openai_api_version`, `your_azure_storage_account_name`, `your_azure_storage_account_key`, and `your_azure_openai_api_embeddings_deployment_name` with your actual credentials.

### Running the Application
Once the `.env` file is configured, run the application using:
```bash
npm run dev
```

### Usage
After running the app, you should be able to start chatting with the ChatGPT model at localhold:3000 by default

## Contributing
We welcome contributions! Please fork the repository and submit pull requests for any improvements or bug fixes.

## License
This project is licensed under the MIT License. See the `LICENSE` file for more details.