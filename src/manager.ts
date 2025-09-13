import crypto from "crypto";
import { dialog, ipcMain } from "electron";
import fs from 'fs';
import { decrypt, encrypt, showDialog } from "./utils.js";
import { mainWindow } from "./window.js";

interface FileData {
  dataPath: string;
  path: string;
  name: string;
  isDirectory: boolean;
  lastModified: number;
  created: number;
  children?: FileData[];
}

export let lfFolderPath: string | null = null
export let cryptoKey: Buffer | null = null;
export let map: FileData[] = []

export async function createNewLFFolder() {
  //LFを作成する場所を選択させて、そのパスを取得
  const result = dialog.showOpenDialogSync(mainWindow!, {
    properties: ["openDirectory", "createDirectory"],
    title: "LFフォルダを作成する場所を選択",
  });
  if (!result) return;
  const parent = result[0];
  
  const lfFolderName = await showDialog(mainWindow!, 'input', 'LFフォルダ名を入力');
  if (!lfFolderName) return;
  
  const pass = await showDialog<string>(mainWindow!, 'pass_input', 'パスワードを設定');
  if (pass != await showDialog<string>(mainWindow!, 'pass_input', 'パスワードを確認')) {
    dialog.showErrorBox('エラー', 'パスワードが一致しません');
    return;
  }
  cryptoKey = crypto.scryptSync(pass, 'salt', 32);
  
  lfFolderPath = `${parent}/${lfFolderName}`;
  fs.mkdirSync(lfFolderPath);

  fs.writeFileSync(`${lfFolderPath}/lfinfo.json`, JSON.stringify({
    version: 1,
  }));

  fs.writeFileSync(`${lfFolderPath}/map.lfi`, encrypt(cryptoKey, Buffer.from('[]')));

  ipcMain.emit('changeLFFolder');
}

export async function openLFFolder() {
  try {
    //LFフォルダを選択
    const result = dialog.showOpenDialogSync(mainWindow!, {
      properties: ["openDirectory"],
      title: "LFフォルダを選択",
    });
    if (!result) return;
    const path = result[0];

    const pass = await showDialog<string>(mainWindow!, 'pass_input', 'パスワードを入力');
    const key = crypto.scryptSync(pass, 'salt', 32);

    const lfInfo = JSON.parse(fs.readFileSync(`${path}/lfinfo.json`, 'utf-8'));
    if (lfInfo.version !== 1) return;
    
    map = JSON.parse(decrypt(key, fs.readFileSync(`${path}/map.lfi`)).toString());

    lfFolderPath = path;
    cryptoKey = key;
    ipcMain.emit('changeLFFolder');
  } catch (e) {
    console.error(e);
  }
}
