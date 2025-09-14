import { MenuItemConstructorOptions } from "electron";

declare global {
  var api: IApi;
}

interface IApi {
  isOpen: () => boolean;
  showContextMenu: (caller: string, data: [string, MenuItemConstructorOptions][]) => Promise<void>;
  getFiles: (path: string) => Promise<FileData[]>;
  newFile: (path: string) => Promise<void>;
  newFolder: (path: string) => Promise<void>;
  open: (path: string, name: string) => Promise<void>;
  rename: (path: string, name: string) => Promise<void>;
  delete: (path: string, name: string) => Promise<void>;

  onContextMenuClick: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void
  ) => Electron.IpcRenderer;
  onChangeLFFolder: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void
  ) => Electron.IpcRenderer;
  onRefresh: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void
  ) => Electron.IpcRenderer;
}

interface FileData {
  name: string;
  lastModified: number;
  created: number;
  isDirectory: boolean;
}
