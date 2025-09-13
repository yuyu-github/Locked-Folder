import { MenuItemConstructorOptions } from "electron";

declare global {
  var api: IApi;
}

interface IApi {
  showContextMenu: (data: [string, MenuItemConstructorOptions][]) => Promise<void>;
  getFiles: () => Promise<FileData[]>;

  onContextMenuClick: (callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => Electron.IpcRenderer,
  onChangeLFFolder: (callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => Electron.IpcRenderer,
}

interface FileData {
  name: string;
  parent: string;
  lastModified: number;
  created: number;
  isDirectory: boolean;
}
