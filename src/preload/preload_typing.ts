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
  uploadFile: (path: string) => Promise<void>;
  uploadFolder: (path: string) => Promise<void>;
  download: (path: string, names: Set<string>) => Promise<void>;
  open: (path: string, name: string) => Promise<void>;
  cut: (path: string, names: Set<string>) => Promise<void>;
  copy: (path: string, names: Set<string>) => Promise<void>;
  paste: (path: string) => Promise<void>;
  rename: (path: string, name: string) => Promise<void>;
  delete: (path: string, names: Set<string>) => Promise<void>;
  getIcon: (ext: string) => Promise<string>;

  onContextMenuClick: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void
  ) => Electron.IpcRenderer;
  onChangeLFFolder: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void
  ) => Electron.IpcRenderer;
  onUpdate: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void
  ) => Electron.IpcRenderer;
}

export interface FileData {
  name: string;
  lastModified: number;
  created: number;
  isDirectory: boolean;
}
