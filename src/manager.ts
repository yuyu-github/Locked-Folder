import chokidar from 'chokidar';
import crypto from 'crypto';
import { dialog } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { decrypt, encrypt, nameResolve, nameResolveFS, showDialog } from './utils.js';
import { LATEST_VERSION, versionUp } from './version.js';
import { mainWindow } from './window.js';

export interface FileData {
  name: string;
  isDirectory: boolean;
  lastModified: number;
  created: number;
  dataName?: string;
  children?: FileData[];
}

export function createFileData(name: string): FileData {
  return {
    name,
    isDirectory: false,
    lastModified: Date.now(),
    created: Date.now(),
    dataName: crypto.randomUUID(),
  };
}

export function createFolderData(name: string): FileData {
  return {
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

export let fileClipboard: {
  type: 'cut' | 'copy' | 'none',
  source: string,
  files: FileData[]
} = { type: 'none', source: '', files: [] };

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
    JSON.stringify({version: LATEST_VERSION})
  );

  fileMap = [];
  fs.writeFileSync(`${lfFolderPath}/map.lfi`, encrypt(cryptoKey, Buffer.from('[]')));

  onChangeLFFolder();
}

export async function openLFFolderUI() {
  //LFフォルダを選択
  const result = dialog.showOpenDialogSync(mainWindow!, {
    properties: ['openDirectory'],
    title: 'LFフォルダを選択',
  });
  if (!result) return;
  const path = result[0];
  await openLFFolder(path);
}

export async function openLFFolder(path: string) {
  try {
    if (!fs.existsSync(`${path}/lfinfo.json`) || !fs.existsSync(`${path}/map.lfi`)) return;

    const pass = await showDialog<string>(mainWindow!, 'pass_input', 'パスワードを入力');
    if (!pass) return;
    const key = crypto.scryptSync(pass, 'salt', 32);

    const lfInfo = JSON.parse(fs.readFileSync(`${path}/lfinfo.json`, 'utf-8'));
    if (lfInfo.version !== LATEST_VERSION) versionUp(lfInfo.version, path, key);

    fileMap = JSON.parse(decrypt(key, fs.readFileSync(`${path}/map.lfi`)).toString());

    lfFolderPath = path;
    cryptoKey = key;
    onChangeLFFolder();
  } catch (e) {
    dialog.showErrorBox('エラー', '読み込みに失敗しました');
    console.error(e);
  }
}

export function onChangeLFFolder() {
  deleteTmpFiles();
  openedFiles = {};
  fileClipboard = { type: 'none', source: '', files: [] };
  mainWindow!.webContents.send('changeLFFolder');
}

export async function changePass() {
  if (!lfFolderPath || !cryptoKey) return;

  const pass = await showDialog<string>(mainWindow!, 'pass_input', 'パスワードを入力');
  if (!pass) return;
  if (!cryptoKey.equals(crypto.scryptSync(pass, 'salt', 32))) {
    dialog.showErrorBox('エラー', 'パスワードが違います');
    return;
  }
  const oldKey = cryptoKey;

  const newPass = await showDialog<string>(mainWindow!, 'pass_input', '新しいパスワードを設定');
  if (!newPass) return;
  if (newPass != (await showDialog<string>(mainWindow!, 'pass_input', 'パスワードを確認'))) {
    dialog.showErrorBox('エラー', 'パスワードが一致しません');
    return;
  }
  const newKey = crypto.scryptSync(newPass, 'salt', 32);

  function reEncrypt(path: string) {
    const data = decrypt(oldKey!, fs.readFileSync(path));
    fs.writeFileSync(path, encrypt(newKey, data));
  }
  
  for (let f of fs.readdirSync(lfFolderPath!)) {
    if (path.extname(f) === '.lfi') reEncrypt(path.join(lfFolderPath!, f));
  }
  for (let f of fs.readdirSync(path.join(lfFolderPath!, 'data'))) {
    reEncrypt(path.join(lfFolderPath!, 'data', f));
  }
}

export function getItem(path: string, name: string): FileData | null {
  const pathlist = path.split('/');
  if (!pathlist[0]) pathlist.shift();
  if (!pathlist.at(-1)) pathlist.pop();

  let current = fileMap;
  for (let i of pathlist) {
    current = current.find((f) => f.isDirectory && f.name === i)?.children || [];
  }
  return current.find((f) => f.name === name) ?? null;
}

export function getChildren(path: string, mkfolder = false): FileData[] {
  const pathlist = path.split('/');
  if (!pathlist[0]) pathlist.shift();
  if (!pathlist.at(-1)) pathlist.pop();

  let current = fileMap;
  for (let i of pathlist) {
    let child = current.find((f) => f.isDirectory && f.name === i);
    if (mkfolder) {
      if (!child) {
        child = createFolderData(i);
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

export function deleteTmpFiles(all = false) {
  if (all) {
    const tmpDir = path.join(os.tmpdir(), 'LockedFolder/open');
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

export function getTmpFilePath(file: FileData): string {
  const lfFolderHash = crypto.createHash('sha256').update(lfFolderPath!).digest('hex');
  const tmpFilePath = path.join(
    os.tmpdir(),
    'LockedFolder/open',
    lfFolderHash,
    `${path.parse(file.name).name}_${file.dataName}${path.extname(file.name)}`
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
  if (!lfFolderPath || !cryptoKey || !file.dataName) return;

  const dataPath = path.join(lfFolderPath, 'data', file.dataName);
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, encrypt(cryptoKey, data));

  file.lastModified = Date.now();
  saveFileMap();
}

chokidar.watch(path.join(os.tmpdir(), 'LockedFolder/open')).on('change', (filepath) => {
  if (filepath in openedFiles && lfFolderPath && cryptoKey) {
    try {
      const data = fs.readFileSync(filepath);
      saveFile(openedFiles[filepath], data);
    } catch (e) {
      console.error(e);
    }
  }
});

export function uploadFiles(filePaths: string[], target: string, nest = false) {
  const children = getChildren(target, true);
  for (let filePath of filePaths) {
    if (!fs.existsSync(filePath)) continue;
    if (filePath.startsWith(lfFolderPath!)) continue;

    if (fs.lstatSync(filePath).isDirectory()) { 
      const folder = createFolderData(nameResolve(target, path.basename(filePath)));
      children.push(folder);

      const subFiles = fs.readdirSync(filePath);
      uploadFiles(subFiles.map(f => path.join(filePath, f)), path.posix.join(target, folder.name), true);
    } else {
      const file = createFileData(nameResolve(target, path.basename(filePath)))
      children.push(file);
      saveFile(file, fs.readFileSync(filePath))
    }
  }

  if (!nest) {
    saveFileMap();
    mainWindow!.webContents.send('update');
  }
}

export function downloadFiles(files: FileData[], target: string) {
  if (!lfFolderPath || !cryptoKey) return;
  for (let file of files) {
    const targetPath = nameResolveFS(path.join(target, file.name));
    if (file.isDirectory) {
      fs.mkdirSync(targetPath);
      if (file.children) downloadFiles(file.children, targetPath);
    } else {
      const dataPath = path.join(lfFolderPath!, 'data', file.dataName!);
      let data;
      if (fs.existsSync(dataPath)) data = decrypt(cryptoKey!, fs.readFileSync(dataPath));
      else data = Buffer.from(''); 
      fs.writeFileSync(targetPath, data);
    }
  }
}

export function copyFile(file: FileData) {
  const newFile: FileData = { ...file };
  if (file.dataName) {
    newFile.dataName = crypto.randomUUID();
    const oldDataPath = path.join(lfFolderPath!, 'data', file.dataName!);
    const newDataPath = path.join(lfFolderPath!, 'data', newFile.dataName!);
    if (fs.existsSync(oldDataPath)) {
      fs.copyFileSync(oldDataPath, newDataPath);
    }
  }
  if (file.children) {
    newFile.children = file.children.map(copyFile);
  }
  return newFile;
}
