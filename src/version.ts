import fs from 'fs';
import { FileData } from './manager.js';
import { decrypt, encrypt } from './utils.js';

export const LATEST_VERSION = 2

function manipulateFileMap(fileMap, func: (i) => FileData) {
  return fileMap.map((i) => {
    if (i.children) manipulateFileMap(i.children, func);
    return func(i);
  })
}

export function versionUp(version: number, path: string, key: Buffer) {
  let fileMap = JSON.parse(decrypt(key, fs.readFileSync(`${path}/map.lfi`)).toString());

  while (version !== LATEST_VERSION) {
    if (version === 1) {
      manipulateFileMap(fileMap, i => {
        delete i.path
        if (i.dataPath && !i.dataName) i.dataName = i.dataPath
        delete i.dataPath
        return i;
      })
      version = 2;
    }
  }

  fs.writeFileSync(`${path}/map.lfi`, encrypt(key, Buffer.from(JSON.stringify(fileMap))));

  const lfInfo = JSON.parse(fs.readFileSync(`${path}/lfinfo.json`, 'utf-8'));
  lfInfo.version = LATEST_VERSION;
  fs.writeFileSync(`${path}/lfinfo.json`, JSON.stringify({ version: LATEST_VERSION }));
}
