import { MenuItemConstructorOptions } from "electron";

declare global {
  var api: IApi;
}

interface IApi {
  ready: () => Promise<void>;
  isOpen: () => boolean;
  openLFFolder: (path: string) => Promise<void>;
  showContextMenu: (caller: string, data: [string, MenuItemConstructorOptions][]) => Promise<void>;
  setViewSetting: (key: string, value: any) => Promise<void>;
  getViewSettings: () => Promise<Record<string, any>>;
  getFiles: (path: string) => Promise<FileData[]>;
  newFile: (path: string) => Promise<void>;
  newFolder: (path: string) => Promise<void>;
  uploadFileUI: (path: string) => Promise<void>;
  uploadFolderUI: (path: string) => Promise<void>;
  uploadFile: (path: string, files: string[]) => Promise<void>;
  download: (path: string, names: Set<string>) => Promise<void>;
  open: (path: string, name: string) => Promise<void>;
  cut: (path: string, names: Set<string>) => Promise<void>;
  copy: (path: string, names: Set<string>) => Promise<void>;
  paste: (path: string) => Promise<void>;
  cancelCut: () => Promise<void>;
  move: (src: string, names: Set<string>, target: string) => Promise<void>;
  rename: (path: string, oldName: string, newName: string) => Promise<void>;
  delete: (path: string, names: Set<string>) => Promise<void>;
  moveToRecycleBin: (path: string, names: Set<string>, recycleBinPath: string) => Promise<void>;
  restore: (names: Set<string>, recycleBinPath: string) => Promise<void>;
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
  onStartRename: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void
  ) => Electron.IpcRenderer;
  onOpenRecycleBin: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void
  ) => Electron.IpcRenderer;

  getPathForFile: (file: File) => string;
}

export interface FileData {
  name: string;
  lastModified: number;
  created: number;
  isDirectory: boolean;
  cut: boolean;
  recycleBinData?: {
    orgPath: string;
    orgName: string;
    deleted: number;
  }
}
