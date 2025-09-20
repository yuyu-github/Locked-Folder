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
export let sortType = 'name';
export let sortReverse = false;

export const flBackgroundDiv = document.getElementById('fl-background')!;
const flOuterDiv = document.getElementById('fl-outer')!;
const flHeaderDiv = document.querySelector('#fl-header > div')!;
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

const cols = {
  'name': '名前',
  'created': '作成日時',
  'modified': '更新日時',
}

const headerFlagment = document.createDocumentFragment();
for (let [cls, name] of Object.entries(cols)) {
  const cellDiv = document.createElement('div');
  cellDiv.classList.add(cls);
  headerFlagment.appendChild(cellDiv);
  const div = document.createElement('div');
  div.classList.add('h-container');
  cellDiv.appendChild(div);
  
  div.addEventListener('click', () => {
    if (sortType === cls) {
      sortReverse = !sortReverse;
    } else {
      sortType = cls;
      sortReverse = false;
    }
    updateSortIcon();
    update();
  });

  const colNameDiv = document.createElement('div');
  colNameDiv.classList.add('col-name');
  colNameDiv.textContent = name;
  div.appendChild(colNameDiv);

  const resizerDiv = document.createElement('div');
  resizerDiv.classList.add('resizer');
  div.appendChild(resizerDiv);

  resizerDiv.addEventListener('click', e => e.stopPropagation())
  resizerDiv.addEventListener('mousedown', (e) => {
    const startX = e.pageX;
    const startWidth = cellDiv.clientWidth;
    document.body.style.cursor = 'col-resize';

    let frameId: number | null = null;
    function resize(e: MouseEvent) {
      if (frameId) return;
      frameId = requestAnimationFrame(() => {
        const newWidth = startWidth + (e.pageX - startX);
        cellDiv.style.minWidth = `${newWidth}px`;
        frameId = null;
      });
    }
    function stopResize() {
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = 'unset';
    }

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  });
}
flHeaderDiv.appendChild(headerFlagment);

export async function updateSortIcon() {
  flHeaderDiv.querySelectorAll('.sort-icon').forEach(i => i.remove());
  const svgStr = `
  <svg width="8" height="4" viewBox="0 0 14 7" xmlns="http://www.w3.org/2000/svg">
    <polyline points="${sortReverse ? '0,7 7,0 14,7' : '0,0 7,7 14,0'}" fill="none" stroke="black" stroke-width="1"/>
  </svg>
  `;
  const svg = new DOMParser().parseFromString(svgStr, 'image/svg+xml').documentElement;
  svg.classList.add('sort-icon');
  flHeaderDiv.querySelector(`.${sortType}`)?.appendChild(svg);
}

export async function update() {
  const flagment = document.createDocumentFragment();

  if (!api.isOpen()) {
    flOuterDiv.style.display = 'none';
    return;
  }
  flOuterDiv.style.display = 'block';

  files = await api.getFiles(currentPath);
  files.sort((a, b) => {
    switch (sortType) {
      case 'created': return a.created - b.created;
      case 'modified': return a.lastModified - b.lastModified;
      case 'name':
      default:
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    }
  })
  if (sortReverse) files.reverse();
  const fileNames = files.map(f => f.name);

  for (let file of files) {
    const div = document.createElement('div');
    flagment.appendChild(div);

    const nameOuterDiv = document.createElement('div');
    nameOuterDiv.classList.add('name-outer');
    if (selectedFiles.has(file.name)) nameOuterDiv.classList.add('selected');
    nameOuterDiv.draggable = true;
    div.appendChild(nameOuterDiv);

    const nameOuterFlexDiv = document.createElement('div');
    nameOuterFlexDiv.classList.add('h-container');
    nameOuterDiv.appendChild(nameOuterFlexDiv);
   
    const iconImg = document.createElement('img');
    iconImg.src = await getIcon(file);
    iconImg.classList.add('icon');
    if (file.cut) iconImg.classList.add('cut');
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

      nameOuterDiv.addEventListener('dragover', (e) => {
        if (e.dataTransfer!.types.includes('Files')) {
          e.dataTransfer!.dropEffect = 'copy';
        } else {
          if (selectedFiles.has(file.name)) return;
          e.dataTransfer!.dropEffect = 'move';
        }
        e.preventDefault();
        nameOuterDiv.classList.add('drop-target');
      });

      nameOuterDiv.addEventListener('dragleave', (e) => {
        nameOuterDiv.classList.remove('drop-target');
      });

      nameOuterDiv.addEventListener('drop', (e) => {
        if (e.dataTransfer?.files.length !== 0) {
          const filepaths = Array.from(e.dataTransfer!.files).map(i => api.getPathForFile(i));
          api.uploadFile(currentPath + `${file.name}/`, filepaths)
        } else {
          if (selectedFiles.has(file.name)) return;
          api.move(currentPath, selectedFiles, currentPath + `${file.name}/`);
        }

        e.preventDefault();
        e.stopPropagation();
        nameOuterDiv.classList.remove('drop-target');
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

      if (selectedFiles.has(file.name)) {
        if (e.button == 0) {
          if (e.ctrlKey) {
            selectedFiles.delete(file.name);
          }
        }
      } else {
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
