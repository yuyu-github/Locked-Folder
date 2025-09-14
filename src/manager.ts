import crypto, { randomUUID } from 'crypto';
import { dialog } from 'electron';
import fs from 'fs';
import { decrypt, encrypt, showDialog } from './utils.js';
import { mainWindow } from './window.js';

interface FileData {
  path: string;
  name: string;
  isDirectory: boolean;
  lastModified: number;
  created: number;
  dataPath?: string;
  children?: FileData[];
}

export function createFileData(path: string, name: string): FileData {
  return {
    path,
    name,
    isDirectory: false,
    lastModified: Date.now(),
    created: Date.now(),
    dataPath: randomUUID(),
  };
}

export function createFolderData(path: string, name: string): FileData {
  return {
    path,
    name,
    isDirectory: true,
    lastModified: Date.now(),
    created: Date.now(),
    children: [],
  };
}

export let lfFolderPath: string | null = null;
export let cryptoKey: Buffer | null = null;
export let fileMap: FileData[] = [];

export async function createNewLFFolder() {
  //LFを作成する場所を選択させて、そのパスを取得
  const result = dialog.showOpenDialogSync(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'LFフォルダを作成する場所を選択',
  });
  if (!result) return;
  const parent = result[0];

  const lfFolderName = await showDialog(mainWindow!, 'input', 'LFフォルダ名を入力');
  if (!lfFolderName) return;

  const pass = await showDialog<string>(mainWindow!, 'pass_input', 'パスワードを設定');
  if (!pass) return;
  if (pass != (await showDialog<string>(mainWindow!, 'pass_input', 'パスワードを確認'))) {
    dialog.showErrorBox('エラー', 'パスワードが一致しません');
    return;
  }
  cryptoKey = crypto.scryptSync(pass, 'salt', 32);

  lfFolderPath = `${parent}/${lfFolderName}`;
  fs.mkdirSync(lfFolderPath);

  fs.writeFileSync(
    `${lfFolderPath}/lfinfo.json`,
    JSON.stringify({
      version: 1,
    })
  );

  fs.writeFileSync(`${lfFolderPath}/map.lfi`, encrypt(cryptoKey, Buffer.from('[]')));

  mainWindow!.webContents.send('changeLFFolder');
}

export async function openLFFolder() {
  try {
    //LFフォルダを選択
    const result = dialog.showOpenDialogSync(mainWindow!, {
      properties: ['openDirectory'],
      title: 'LFフォルダを選択',
    });
    if (!result) return;
    const path = result[0];

    const pass = await showDialog<string>(mainWindow!, 'pass_input', 'パスワードを入力');
    if (!pass) return;
    const key = crypto.scryptSync(pass, 'salt', 32);

    const lfInfo = JSON.parse(fs.readFileSync(`${path}/lfinfo.json`, 'utf-8'));
    if (lfInfo.version !== 1) return;

    fileMap = JSON.parse(decrypt(key, fs.readFileSync(`${path}/map.lfi`)).toString());

    lfFolderPath = path;
    cryptoKey = key;
    mainWindow!.webContents.send('changeLFFolder');
  } catch (e) {
    console.error(e);
  }
}

export function getItem(path: string, name: string): FileData | null {
  let current = fileMap;
  for (let i in path.replace(/^\/|\/$/g, '').split('/')) {
    current = current.find((f) => f.isDirectory && f.name === i)?.children || [];
  }
  return current.find((f) => f.name === name) ?? null;
}

export function getChildren(path: string, mkfolder = false): FileData[] {
  let current = fileMap;
  for (let i in path.replace(/^\/|\/$/g, '').split('/')) {
    let child = current.find((f) => f.isDirectory && f.name === i);
    if (!child) {
      child = createFolderData(path, i);
      current.push(child);
    }
    if (!child.children) child.children = [];
    current = child.children;
  }
  return current;
}
