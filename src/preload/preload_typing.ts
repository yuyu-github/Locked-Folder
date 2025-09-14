import { MenuItemConstructorOptions } from "electron";

declare global {
  var api: IApi;
}

interface IApi {
  isOpen: () => boolean;
  showContextMenu: (data: [string, MenuItemConstructorOptions][]) => Promise<void>;
  getFiles: (path: string) => Promise<FileData[]>;
  newFile: (path: string) => Promise<void>;
  newFolder: (path: string) => Promise<void>;

  onContextMenuClick: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void
  ) => Electron.IpcRenderer;
  onChangeLFFolder: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void
  ) => Electron.IpcRenderer;
}

interface FileData {
  name: string;
  lastModified: number;
  created: number;
  isDirectory: boolean;
}
