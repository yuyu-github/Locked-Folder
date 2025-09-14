import { ipcMain, Menu, MenuItemConstructorOptions, shell } from 'electron';
import fs from 'fs';
import { dirname, join as joinPath } from 'path';
import {
  copyFile,
  createFileData,
  createFolderData,
  cryptoKey,
  fileClipboard,
  getChildren,
  getItem,
  getTmpFilePath,
  lfFolderPath,
  openedFiles,
  saveFileMap,
  setFileClipboard,
} from './manager.js';
import { decrypt, nameResolve, showDialog } from './utils.js';
import { mainWindow } from './window.js';

ipcMain.on('isOpen', (event) => {
  event.returnValue = lfFolderPath !== null;
});

ipcMain.handle(
  'showContextMenu',
  (e, caller: string, data: [string, MenuItemConstructorOptions][]) => {
    const options = data.map(([id, option]) => ({
      ...option,
      click: () => {
        e.sender.send('contextMenuClick', caller, id);
      },
    }));
    const menu = Menu.buildFromTemplate(options);
    menu.popup({ window: mainWindow! });
  }
);

ipcMain.handle('getFiles', (e, path: string) => {
  return getChildren(path).map((i) => ({
    name: i.name,
    lastModified: i.lastModified,
    created: i.created,
    isDirectory: i.isDirectory,
  }));
});

ipcMain.handle('newFile', async (e, path: string) => {
  const name = await showDialog<string>(mainWindow!, 'input', 'ファイル名を入力');
  if (!name) return;

  getChildren(path, true).push(createFileData(nameResolve(path, name)));

  saveFileMap();
  mainWindow!.webContents.send('refresh');
});

ipcMain.handle('newFolder', async (e, path: string) => {
  const name = await showDialog<string>(mainWindow!, 'input', 'フォルダ名を入力');
  if (!name) return;

  getChildren(path, true).push(createFolderData(nameResolve(path, name)));

  saveFileMap();
  mainWindow!.webContents.send('refresh');
});

ipcMain.handle('open', async (e, path: string, name: string) => {
  if (!lfFolderPath || !cryptoKey) return;

  const file = getItem(path, name);
  if (!file || file.isDirectory) return;

  if (!file.dataName) file.dataName = crypto.randomUUID();
  const dataPath = joinPath(lfFolderPath, 'data', file.dataName);

  let data: Buffer;
  if (fs.existsSync(dataPath)) {
    data = decrypt(cryptoKey!, fs.readFileSync(dataPath));
  } else {
    data = Buffer.from('');
  }

  const tmpFilePath = getTmpFilePath(file);
  fs.mkdirSync(dirname(tmpFilePath), { recursive: true });
  fs.writeFileSync(tmpFilePath, data);
  shell.openPath(tmpFilePath);
  openedFiles[tmpFilePath] = file;
});

ipcMain.handle('cut', (e, path: string, name: string) => {
  const file = getItem(path, name);
  if (!file) return;
  setFileClipboard([file]);

  const children = getChildren(path);
  for (let i = children.length - 1; i >= 0; i--) {
    if (children[i].name === name) children.splice(i, 1);
  }

  saveFileMap();
  mainWindow!.webContents.send('refresh');
});

ipcMain.handle('copy', (e, path: string, name: string) => {
  const file = getItem(path, name);
  if (!file) return;
  setFileClipboard([copyFile(file)]);
});

ipcMain.handle('paste', (e, path: string) => {
  const children = getChildren(path, true);
  for (let file of fileClipboard) {
    file.name = nameResolve(path, file.name);
    children.push(file);
  }

  saveFileMap();
  mainWindow!.webContents.send('refresh');
});

ipcMain.handle('rename', async (e, path: string, name: string) => {
  const newName = await showDialog<string>(mainWindow!, 'input', '新しい名前を入力', {
    default: name,
  });
  if (!newName) return;

  const file = getItem(path, name);
  if (file) file.name = nameResolve(path, newName);

  saveFileMap();
  mainWindow!.webContents.send('refresh');
});

ipcMain.handle('delete', async (e, path: string, name: string) => {
  const children = getChildren(path);
  for (let i = children.length - 1; i >= 0; i--) {
    if (children[i].name === name) children.splice(i, 1);
  }

  saveFileMap();
  mainWindow!.webContents.send('refresh');
});
