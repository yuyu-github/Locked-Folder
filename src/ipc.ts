import { app, dialog, ipcMain, Menu, MenuItemConstructorOptions, shell } from 'electron';
import fs from 'fs';
import os from 'os';
import path, { dirname, join as joinPath } from 'path';
import {
  copyFile,
  createFileData,
  createFolderData,
  cryptoKey,
  deleteFiles,
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
import { decrypt, nameResolve } from './utils.js';
import { mainWindow } from './window.js';

ipcMain.handle('ready', () => {
  if (lfFolderPath) {
    mainWindow!.webContents.send('changeLFFolder', path.basename(lfFolderPath));
  }
})

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

ipcMain.handle('setViewSetting', async (e, key: string, value: any) => {
  if (!lfFolderPath) return;
  const settingsPath = joinPath(lfFolderPath, 'viewsettings.json');
  let settings: Record<string, any> = {};
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  }

  let current = settings;
  for (let i of key.split('.').slice(0, -1)) {
    current[i] ??= {};
    current = current[i]
  }
  current[key.split('.').at(-1)!] = value;

  fs.writeFileSync(settingsPath, JSON.stringify(settings));
});

ipcMain.handle('getViewSettings', async (e) => {
  if (!lfFolderPath) return {};
  const settingsPath = joinPath(lfFolderPath, 'viewsettings.json');
  let settings: Record<string, any> = {};
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  }
  return settings;
});

ipcMain.handle('getFiles', (e, path: string) => {
  const cutFiles = fileClipboard.type === 'cut' && fileClipboard.source === path ? fileClipboard.files.map(i => i.name) : [];
  return getChildren(path).map((i) => ({
    name: i.name,
    lastModified: i.lastModified,
    created: i.created,
    isDirectory: i.isDirectory,
    cut: cutFiles.includes(i.name),
    recycleBinData: i.recycleBinData
  }));
});

ipcMain.handle('newFile', async (e, path: string) => {
  const name = nameResolve(path, '新しいファイル');
  getChildren(path, true).push(createFileData(name));

  saveFileMap();
  mainWindow!.webContents.send('startRename', name);
});

ipcMain.handle('newFolder', async (e, path: string) => {
  const name = nameResolve(path, '新しいフォルダ');
  getChildren(path, true).push(createFolderData(name));

  saveFileMap();
  mainWindow!.webContents.send('startRename', name);
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

  if (fileClipboard.type !== 'copy') {
    fileClipboard.type = 'none';
    fileClipboard.source = '';
    fileClipboard.files = [];
  }

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
  const files = Array.from(names).map(i => getItem(src, i)).filter(i => i !== null);
  
  const srcChildren = getChildren(src);
  for (let i = srcChildren.length - 1; i >= 0; i--) {
    if (names.has(srcChildren[i].name)) {
      srcChildren.splice(i, 1);
    }
  }
  
  const targetChildren = getChildren(target, true);
  for (let file of files) {
    file.name = nameResolve(target, file.name);
    targetChildren.push(file);
  }

  saveFileMap();
  mainWindow!.webContents.send('update');
});

ipcMain.handle('rename', async (e, path: string, oldName: string, newName: string) => {
  const file = getItem(path, oldName);
  if (file) file.name = nameResolve(path, newName);

  saveFileMap();
  mainWindow!.webContents.send('update');
});

ipcMain.handle('delete', async (e, path: string, names: Set<string>) => {
  const result = await dialog.showMessageBox(mainWindow!, {
    type: 'warning',
    buttons: ['キャンセル', '削除'],
    defaultId: 1,
    cancelId: 0,
    title: '確認',
    message: '本当に削除しますか？',
    noLink: true,
  })
  if (result.response === 0) return;

  
  const children = getChildren(path);
  deleteFiles(children);
  for (let i = children.length - 1; i >= 0; i--) {
    if (names.has(children[i].name)) {
      children.splice(i, 1);
    }
  }

  saveFileMap();
  mainWindow!.webContents.send('update');
});

ipcMain.handle('moveToRecycleBin', async (e, path: string, names: Set<string>, recycleBinPath: string) => {
  const files = Array.from(names).map(i => getItem(path, i)).filter(i => i !== null);
  
  const srcChildren = getChildren(path);
  for (let i = srcChildren.length - 1; i >= 0; i--) {
    if (names.has(srcChildren[i].name)) {
      srcChildren.splice(i, 1);
    }
  }
  
  const recycleBin = getChildren(recycleBinPath, true);
  for (let file of files) {
    file.recycleBinData = {
      orgPath: path,
      orgName: file.name,
      deleted: Date.now()
    };
    const id = [...Array(6)].map(() => Math.floor(Math.random()*16).toString(16).toUpperCase()).join('');
    const ext = file.isDirectory ? '' : file.name.match(/(?<!^)\.[^\.]+$/)?.[0] ?? '';
    file.name = nameResolve(recycleBinPath, id + ext);
    recycleBin.push(file);
  }

  saveFileMap();
  mainWindow!.webContents.send('update');
});

ipcMain.handle('restore', async (e, names: Set<string>, recycleBinPath: string) => {
  const files = Array.from(names).map(i => getItem(recycleBinPath, i)).filter(i => i !== null);
  
  const recycleBin = getChildren(recycleBinPath);
  for (let i = recycleBin.length - 1; i >= 0; i--) {
    if (names.has(recycleBin[i].name)) {
      recycleBin.splice(i, 1);
    }
  }
  
  for (let file of files) {
    if (!file.recycleBinData) continue;
    const {orgPath, orgName} = file.recycleBinData;
    const targetChildren = getChildren(orgPath, true);
    file.name = nameResolve(orgPath, orgName);
    delete file.recycleBinData;
    targetChildren.push(file);
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
