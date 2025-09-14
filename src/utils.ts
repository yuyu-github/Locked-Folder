import crypto from "crypto";
import { BrowserWindow, ipcMain } from "electron";
import fs from 'fs';
import path from 'path';

export function encrypt(key: Buffer, data: Buffer): Buffer {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

export function decrypt(key: Buffer, data: Buffer): Buffer {
  const iv = data.subarray(0, 16);
  const encrypted = data.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export async function showDialog<T>(
  parent: BrowserWindow,
  name: string,
  title: string,
  args: Record<string, string> = {}
): Promise<T | null> {
  const options = JSON.parse(
    fs.readFileSync(path.join(__dirname, `dialog/${name}/options.json`), 'utf-8')
  );
  const win = new BrowserWindow({
    width: options.width,
    height: options.height,
    parent,
    title,
    modal: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      additionalArguments: Object.entries(args).map(([k, v]) => `--${k}=${v}`),
    },
  });
  win.setMenu(null);
  win.loadFile(path.join(__dirname, `dialog/${name}/index.html`));

  return new Promise((resolve) => {
    function onReturn(e, value) {
      if (e.sender === win.webContents) {
        resolve(value);
        ipcMain.removeListener('return', onReturn);
        win.close();
      }
    }
    ipcMain.on('return', onReturn);
    win.on('closed', () => {
      resolve(null);
      ipcMain.removeListener('return', onReturn);
    });
  });
}
