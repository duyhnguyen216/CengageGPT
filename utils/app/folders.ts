import { FolderInterface } from '@/types/folder';
import { exportData } from './importExport';

export const saveFolders = (folders: FolderInterface[]) => {
  localStorage.setItem('folders', JSON.stringify(folders));
  exportData(true);
};
