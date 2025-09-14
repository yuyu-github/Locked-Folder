import { ipcMain, Menu, MenuItemConstructorOptions } from "electron";
import { createFileData, createFolderData, fileMap, lfFolderPath } from './manager.js';
import { showDialog } from './utils.js';
import { mainWindow } from './window.js';

ipcMain.on('isOpen', (event) => {
  event.returnValue = lfFolderPath !== null;
});

ipcMain.handle('showContextMenu', (e, data: [string, MenuItemConstructorOptions][]) => {
  const options = data.map(([id, option]) => ({
    ...option,
    click: () => {
      e.sender.send('contextMenuClick', id);
    },
  }));
  const menu = Menu.buildFromTemplate(options);
  menu.popup({ window: mainWindow! });
});

ipcMain.handle('getFiles', (e, path: string) => {
  let current = fileMap;
  for (let i in path.split('/').slice(1)) {
    current = current.find((f) => f.isDirectory && f.name === i)?.children || [];
  }

  return current.map((i) => ({
    name: i.name,
    lastModified: i.lastModified,
    created: i.created,
    isDirectory: i.isDirectory,
  }));
});

ipcMain.handle('newFile', async (e, path: string) => {
  const name = await showDialog<string>(mainWindow!, 'input', 'ファイル名を入力');
  if (!name) return;

  let current = fileMap;
  for (let i in path.split('/').slice(1)) {
    let child = current.find((f) => f.isDirectory && f.name === i);
    if (!child) {
      child = createFolderData(path, i);
      current.push(child);
    }
    if (!child.children) child.children = [];
    current = child.children;
  }

  current.push(createFileData(path, name));

  mainWindow!.webContents.send('changeLFFolder');
});

ipcMain.handle('newFolder', async (e, path: string) => {
  const name = await showDialog<string>(mainWindow!, 'input', 'フォルダ名を入力');
  if (!name) return;

  let current = fileMap;
  for (let i in path.split('/').slice(1)) {
    let child = current.find((f) => f.isDirectory && f.name === i);
    if (!child) {
      child = createFolderData(path, i);
      current.push(child);
    }
    if (!child.children) child.children = [];
    current = child.children;
  }
  current.push(createFolderData(path, name));

  mainWindow!.webContents.send('changeLFFolder');
});
