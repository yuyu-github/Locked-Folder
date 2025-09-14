import chokidar from 'chokidar';
import crypto, { randomUUID } from 'crypto';
import { dialog } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
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
export let openedFiles: Record<string, FileData> = {};

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

  deleteTmpFiles();
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

    deleteTmpFiles();

    lfFolderPath = path;
    cryptoKey = key;
    mainWindow!.webContents.send('changeLFFolder');
  } catch (e) {
    dialog.showErrorBox('エラー', '読み込みに失敗しました');
    console.error(e);
  }
}

export function deleteTmpFiles(all = false) {
  if (all) {
    const tmpDir = path.join(os.tmpdir(), 'LockedFolder');
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } else {
    for (let f in openedFiles) {
      if (fs.existsSync(f)) {
        fs.rmSync(f);
      }
    }
  }
}

export function getItem(path: string, name: string): FileData | null {
  let current = fileMap;
  for (let i of path.replace(/^\/|\/$/g, '').split('/')) {
    current = current.find((f) => f.isDirectory && f.name === i)?.children || [];
  }
  return current.find((f) => f.name === name) ?? null;
}

export function getChildren(path: string, mkfolder = false): FileData[] {
  let current = fileMap;
  for (let i of path.replace(/^\/|\/$/g, '').split('/')) {
    let child = current.find((f) => f.isDirectory && f.name === i);
    if (mkfolder) {
      if (!child) {
        child = createFolderData(path, i);
        current.push(child);
      }
      if (!child.children) child.children = [];
      current = child.children;
    } else {
      current = child?.children ?? [];
    }
  }
  return current;
}

export function getTmpFilePath(file: FileData): string {
  const lfFolderHash = crypto.createHash('sha256').update(lfFolderPath!).digest('hex');
  const tmpFilePath = path.join(
    os.tmpdir(),
    'LockedFolder',
    lfFolderHash,
    `${path.parse(file.name).name}_${file.dataPath}${path.extname(file.name)}`
  );
  return tmpFilePath;
}

export function saveFileMap() {
  if (!lfFolderPath || !cryptoKey) return;
  fs.writeFileSync(
    `${lfFolderPath}/map.lfi`,
    encrypt(cryptoKey, Buffer.from(JSON.stringify(fileMap)))
  );
}

export function saveFile(file: FileData, data: Buffer) {
  if (!lfFolderPath || !cryptoKey || !file.dataPath) return;

  const dataPath = path.join(lfFolderPath, 'data', file.dataPath);
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, encrypt(cryptoKey, data));

  file.lastModified = Date.now();
  saveFileMap();
}

chokidar.watch(path.join(os.tmpdir(), 'LockedFolder')).on('change', (filepath) => {
  if (filepath in openedFiles && lfFolderPath && cryptoKey) {
    try {
      const data = fs.readFileSync(filepath);
      saveFile(openedFiles[filepath], data);
    } catch (e) {
      console.error(e);
    }
  }
});
