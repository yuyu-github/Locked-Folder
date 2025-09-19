import { FileData } from '../preload/preload_typing.js';
import { currentPath, setCurrentPath } from "./manager.js";

const iconCache: Record<string, string> = {};

async function getIcon(file: FileData) {
  if (file.isDirectory) {
    return 'img/folder.png';
  } else {
    const ext = file.name.match(/(?<!^)\.[^\.]+$/)?.[0];
    if (!ext) return 'img/file.png';
    if (ext in iconCache) return iconCache[ext];
    const icon = await api.getIcon(ext);
    iconCache[ext] = icon;
    return icon;
  }
}

export let files: FileData[] = []
export const selectedFiles: Set<string> = new Set();

export const flBackgroundDiv = document.getElementById('fl-background')!;
const flOuterDiv = document.getElementById('fl-outer')!;
const flContentsDiv = document.getElementById('fl-contents')!;

flBackgroundDiv.addEventListener('contextmenu', (e) => {
  if (!api.isOpen()) return;

  api.showContextMenu('', [
    ['newFile', { label: 'ファイルを作成' }],
    ['newFolder', { label: 'フォルダを作成' }],
    ['uploadFile', { label: 'ファイルをアップロード' }],
    ['uploadFolder', { label: 'フォルダをアップロード' }],
    ['', { type: 'separator' }],
    ['paste', { label: '貼り付け' }],
  ]);
});

flBackgroundDiv.addEventListener('mousedown', () => {
  selectedFiles.clear();
  selectedUpdate();
});

export async function update() {
  const flagment = document.createDocumentFragment();

  if (!api.isOpen()) {
    flOuterDiv.style.display = 'none';
    return;
  }
  flOuterDiv.style.display = 'block';

  files = await api.getFiles(currentPath);
  const fileNames = files.map(f => f.name);

  for (let file of files) {
    const div = document.createElement('div');
    flagment.appendChild(div);

    const nameOuterDiv = document.createElement('div');
    nameOuterDiv.classList.add('name-outer');
    if (selectedFiles.has(file.name)) nameOuterDiv.classList.add('selected');
    const nameOuterFlexDiv = document.createElement('div');
    nameOuterFlexDiv.classList.add('h-container');
    nameOuterDiv.appendChild(nameOuterFlexDiv);
    div.appendChild(nameOuterDiv);
   
    const iconImg = document.createElement('img');
    iconImg.src = await getIcon(file);
    iconImg.classList.add('icon');
    nameOuterFlexDiv.appendChild(iconImg);
    
    const nameDiv = document.createElement('div');
    nameDiv.textContent = file.name;
    nameDiv.classList.add('name');
    nameOuterFlexDiv.appendChild(nameDiv);

    const createdDiv = document.createElement('div');
    createdDiv.textContent = new Date(file.created).toLocaleString();
    createdDiv.classList.add('created');
    div.appendChild(createdDiv);

    const modifiedDiv = document.createElement('div');
    modifiedDiv.textContent = new Date(file.lastModified).toLocaleString();
    modifiedDiv.classList.add('modified');
    div.appendChild(modifiedDiv);

    if (file.isDirectory) {
      nameOuterDiv.addEventListener('contextmenu', (e) => {
        e.stopPropagation();
        api.showContextMenu(`folder-${file.name}`, [
          ['download', { label: 'ダウンロード' }],
          ['', { type: 'separator' }],
          ['cut', { label: '切り取り' }],
          ['copy', { label: 'コピー' }],
          ['', { type: 'separator' }],
          ['rename', { label: '名前を変更' }],
          ['delete', { label: '削除' }],
        ]);
      });

      nameOuterDiv.addEventListener('dblclick', () => {
        setCurrentPath(currentPath + `${file.name}/`);
      });
    } else {
      nameOuterDiv.addEventListener('contextmenu', (e) => {
        e.stopPropagation();
        api.showContextMenu(`file-${file.name}`, [
          ['open', { label: '開く' }],
          ['download', { label: 'ダウンロード' }],
          ['', { type: 'separator' }],
          ['cut', { label: '切り取り' }],
          ['copy', { label: 'コピー' }],
          ['', { type: 'separator' }],
          ['rename', { label: '名前を変更' }],
          ['delete', { label: '削除' }],
        ]);
      });

      nameOuterDiv.addEventListener('dblclick', () => {
        api.open(currentPath, file.name);
      });
    }

    nameOuterDiv.addEventListener('mousedown', (e) => {
      e.stopPropagation();

      if (e.button == 0) {
        if (e.ctrlKey) {
          selectedFiles.add(file.name);
        } else if (e.shiftKey) {
          if (selectedFiles.size === 0) {
            selectedFiles.add(file.name);
          } else {
            const start = fileNames.indexOf(selectedFiles.values().next().value!);
            const end = fileNames.indexOf(file.name);
            if (start == -1 || end == -1) return;

            selectedFiles.clear();
            if (start < end) fileNames.slice(start, end + 1).forEach(n => selectedFiles.add(n));
            else fileNames.slice(end, start + 1).toReversed().forEach(n => selectedFiles.add(n));
          }
        } else {
          selectedFiles.clear();
          selectedFiles.add(file.name);
        }
      } else if (e.button == 2) {
        if (!selectedFiles.has(file.name)) {
          selectedFiles.clear();
          selectedFiles.add(file.name);
        }
      }

      selectedUpdate();
    });
  }

  flContentsDiv.innerHTML = '';
  flContentsDiv.appendChild(flagment);
}
api.onUpdate(update);

export function selectedUpdate() {
  for (let div of flContentsDiv.querySelectorAll('.name-outer')) {
    const name = div.querySelector('.name')!.textContent;
    if (selectedFiles.has(name)) {
      div.classList.add('selected');
    } else {
      div.classList.remove('selected');
    }
  }
}
