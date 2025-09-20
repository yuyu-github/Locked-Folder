import { app, dialog, ipcMain, Menu, MenuItemConstructorOptions, shell } from 'electron';
import fs from 'fs';
import os from 'os';
import { dirname, join as joinPath } from 'path';
import {
  copyFile,
  createFileData,
  createFolderData,
  cryptoKey,
  downloadFiles,
  fileClipboard,
  getChildren,
  getItem,
  getTmpFilePath,
  lfFolderPath,
  openedFiles,
  openLFFolder,
  saveFileMap,
  uploadFiles
} from './manager.js';
import { decrypt, nameResolve, showDialog } from './utils.js';
import { mainWindow } from './window.js';

ipcMain.on('isOpen', (e) => {
  e.returnValue = lfFolderPath !== null;
});

ipcMain.handle('openLFFolder', async (e, path: string) => {
  await openLFFolder(path);
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
  const cutFiles = fileClipboard.type === 'cut' && fileClipboard.source === path ? fileClipboard.files.map(i => i.name) : [];
  return getChildren(path).map((i) => ({
    name: i.name,
    lastModified: i.lastModified,
    created: i.created,
    isDirectory: i.isDirectory,
    cut: cutFiles.includes(i.name)
  }));
});

ipcMain.handle('newFile', async (e, path: string) => {
  const name = await showDialog<string>(mainWindow!, 'input', 'ファイル名を入力');
  if (!name) return;

  getChildren(path, true).push(createFileData(nameResolve(path, name)));

  saveFileMap();
  mainWindow!.webContents.send('update');
});

ipcMain.handle('newFolder', async (e, path: string) => {
  const name = await showDialog<string>(mainWindow!, 'input', 'フォルダ名を入力');
  if (!name) return;

  getChildren(path, true).push(createFolderData(nameResolve(path, name)));

  saveFileMap();
  mainWindow!.webContents.send('update');
});

ipcMain.handle('uploadFileUI', async (e, path: string) => {
  if (!lfFolderPath || !cryptoKey) return;

  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    title: 'ファイルを選択',
    buttonLabel: 'アップロード',
  });
  if (result.canceled || result.filePaths.length === 0) return;

  uploadFiles(result.filePaths, path)
});

ipcMain.handle('uploadFolderUI', async (e, path: string) => {
  if (!lfFolderPath || !cryptoKey) return;

  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'multiSelections'],
    title: 'フォルダを選択',
    buttonLabel: 'アップロード',
  });
  if (result.canceled || result.filePaths.length === 0) return;

  uploadFiles(result.filePaths, path)
});

ipcMain.handle('uploadFile', async (e, path: string, files: string[]) => {
  uploadFiles(files, path)
});

ipcMain.handle('download', async (e, path: string, names: Set<string>) => {
  if (!lfFolderPath || !cryptoKey) return;

  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: '保存先を選択',
    buttonLabel: 'ダウンロード',
  });
  if (result.canceled || result.filePaths.length === 0) return;
  const target = result.filePaths[0];

  const files = Array.from(names).map(i => getItem(path, i)).filter(i => i !== null);
  downloadFiles(files, target);
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

ipcMain.handle('cut', (e, path: string, names: Set<string>) => {
  const files = Array.from(names).map(i => getItem(path, i)).filter(i => i !== null);
  fileClipboard.type = 'cut';
  fileClipboard.source = path;
  fileClipboard.files = files;

  mainWindow!.webContents.send('update');
});

ipcMain.handle('copy', (e, path: string, names: Set<string>) => {
  const files = Array.from(names).map(i => getItem(path, i)).filter(i => i !== null);
  fileClipboard.type = 'copy';
  fileClipboard.source = path;
  fileClipboard.files = files;

  mainWindow!.webContents.send('update');
});

ipcMain.handle('paste', (e, path: string) => {
  if (fileClipboard.type === 'copy') {
    const targetChildren = getChildren(path, true);
    for (let file of fileClipboard.files.map(copyFile)) {
      file.name = nameResolve(path, file.name);
      targetChildren.push(file);
    }
  } else if (fileClipboard.type === 'cut' && fileClipboard.source !== path) {
    const targetChildren = getChildren(path, true);
    for (let file of fileClipboard.files) {
      file.name = nameResolve(path, file.name);
      targetChildren.push(file);
    }

    const sourceChildren = getChildren(fileClipboard.source);
    const names = new Set(fileClipboard.files.map(i => i.name));
    for (let i = sourceChildren.length - 1; i >= 0; i--) {
      if (names.has(sourceChildren[i].name)) {
        sourceChildren.splice(i, 1);
      }
    }
  }

  fileClipboard.type = 'none';
  fileClipboard.source = '';
  fileClipboard.files = [];

  saveFileMap();
  mainWindow!.webContents.send('update');
});

ipcMain.handle('cancelCut', (e) => {
  if (fileClipboard.type === 'cut') {
    fileClipboard.type = 'none';
    fileClipboard.source = '';
    fileClipboard.files = [];
  }

  mainWindow!.webContents.send('update');
});

ipcMain.handle('move', (e, src: string, names: Set<string>, target: string) => {
  for (let name of names) {
    const file = getItem(src, name);
    if (!file) return;
    file.name = nameResolve(target, name);
    getChildren(target, true).push(file);
  }

  const children = getChildren(src);
  for (let i = children.length - 1; i >= 0; i--) {
    if (names.has(children[i].name)) {
      children.splice(i, 1);
    }
  }

  saveFileMap();
  mainWindow!.webContents.send('update');
});

ipcMain.handle('rename', async (e, path: string, name: string) => {
  const newName = await showDialog<string>(mainWindow!, 'input', '新しい名前を入力', {
    default: name,
  });
  if (!newName) return;

  const file = getItem(path, name);
  if (file) file.name = nameResolve(path, newName);

  saveFileMap();
  mainWindow!.webContents.send('update');
});

ipcMain.handle('delete', async (e, path: string, names: Set<string>) => {
  const children = getChildren(path);
  for (let i = children.length - 1; i >= 0; i--) {
    if (names.has(children[i].name)) {
      children.splice(i, 1);
    }
  }

  saveFileMap();
  mainWindow!.webContents.send('update');
});

ipcMain.handle('getIcon', async (e, ext: string) => {
  const iconDir = joinPath(os.tmpdir(), 'LockedFolder/icon');
  if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir, { recursive: true });
  const filePath = joinPath(iconDir, `_${ext}`);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '');

  const icon = await app.getFileIcon(filePath, { size: 'normal' })
  return icon.toDataURL();
});
