import { NextApiRequest, NextApiResponse } from 'next';
import { generateBlobSASQueryParameters, ContainerSASPermissions, SASProtocol, StorageSharedKeyCredential } from "@azure/storage-blob";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const containerName = 'cengagegpt-docs';
  const storageAccount = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
  const storageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';

  const sharedKeyCredential = new StorageSharedKeyCredential(storageAccount, storageAccountKey);

  const permissions = ContainerSASPermissions.parse('racwdlf'); // read, add, create, write, delete, list, find permissions
  const sasToken = generateBlobSASQueryParameters({
    containerName,
    permissions,
    startsOn: new Date(),
    expiresOn: new Date(new Date().valueOf() + 86400), // Token valid for one day
    protocol: SASProtocol.HttpsAndHttp,
  }, sharedKeyCredential).toString();

  res.status(200).json({ sasToken });
}
