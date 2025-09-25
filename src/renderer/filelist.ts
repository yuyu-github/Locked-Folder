import { FileData } from '../preload/preload_typing.js';
import { updateAddressbar } from './addressbar.js';
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

export const RECYCLE_BIN_PATH = '/$RECYCLE.BIN/';

export let headerCols: [string, string][] = [];
export let files: FileData[] = []
export const selectedFiles: Set<string> = new Set();
export let currentFile: string | null = null;
export let sortType = 'name';
export let sortReverse = false;

export function setCurrentFile(name: string | null) { currentFile = name; }

export const flBackgroundDiv = document.getElementById('fl-background')!;
const flOuterDiv = document.getElementById('fl-outer')!;
const flHeaderDiv = document.querySelector('#fl-header > div')!;
const flContentsDiv = document.getElementById('fl-contents')!;

flBackgroundDiv.addEventListener('contextmenu', (e) => {
  if (!api.isOpen()) return;
  if (currentPath === RECYCLE_BIN_PATH) return;

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

export async function updateAll() {
  await updateHeader();
  await update();
  updateAddressbar();
}

export async function updateHeader() {
  if (currentPath === RECYCLE_BIN_PATH) {
    headerCols = [
      ['name', '名前'],
      ['orgPath', '元の場所'],
      ['deleted', '削除日時'],
    ]
  } else {
    headerCols = [
      ['name', '名前'],
      ['created', '作成日時'],
      ['modified', '更新日時'],
    ]
  }

  const headerFlagment = document.createDocumentFragment();
  for (let [cls, name] of headerCols) {
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

      if (currentPath === RECYCLE_BIN_PATH) {
        api.setViewSetting('recycleBin.sortType', sortType);
        api.setViewSetting('recycleBin.sortReverse', sortReverse);
      } else {
        api.setViewSetting('sortType', sortType);
        api.setViewSetting('sortReverse', sortReverse);
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
        api.setViewSetting(`colWidth.${cls}`, cellDiv.style.minWidth);
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
        document.body.style.cursor = 'unset';
      }

      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResize);
    });

  }

  if (headerCols.findIndex(i => i[0] === sortType) === -1) {
    sortType = 'name';
    sortReverse = false;
  }

  await applyViewSettings(headerFlagment);

  flHeaderDiv.innerHTML = '';
  flHeaderDiv.appendChild(headerFlagment);

}

export async function applyViewSettings(headerElem: DocumentFragment|Element = flHeaderDiv) {
  const viewSettings = await api.getViewSettings();
  if (currentPath === RECYCLE_BIN_PATH) {
    if (viewSettings.recycleBin?.sortType) sortType = viewSettings.recycleBin.sortType;
    if (viewSettings.recycleBin?.sortReverse) sortReverse = viewSettings.recycleBin.sortReverse;
  } else {
    if (viewSettings.sortType) sortType = viewSettings.sortType;
    if (viewSettings.sortReverse) sortReverse = viewSettings.sortReverse;
  }

  await updateSortIcon(headerElem);

  for (let [col, _] of headerCols) {
    if (viewSettings.colWidth?.[col]) {
      const colDiv = headerElem.querySelector<HTMLElement>(`.${col}`);
      if (colDiv) colDiv.style.minWidth = viewSettings.colWidth[col];
    }
  }
}

export async function updateSortIcon(headerElem: DocumentFragment|Element = flHeaderDiv) {
  headerElem.querySelectorAll('.sort-icon').forEach(i => i.remove());
  const svgStr = `
  <svg width="8" height="4" viewBox="0 0 14 7" xmlns="http://www.w3.org/2000/svg">
    <polyline points="${sortReverse ? '0,7 7,0 14,7' : '0,0 7,7 14,0'}" fill="none" stroke="black" stroke-width="1"/>
  </svg>
  `;
  const svg = new DOMParser().parseFromString(svgStr, 'image/svg+xml').documentElement;
  svg.classList.add('sort-icon');
  headerElem.querySelector(`.${sortType}`)?.appendChild(svg);
}

export async function update() {
  const flagment = document.createDocumentFragment();

  if (!api.isOpen()) {
    flOuterDiv.style.display = 'none';
    return;
  }
  flOuterDiv.style.display = 'block';

  const inRecycleBin = (currentPath === RECYCLE_BIN_PATH);

  files = (await api.getFiles(currentPath)).filter(i => `${currentPath}${i.name}/` !== RECYCLE_BIN_PATH);
  files.sort((a, b) => {
    switch (sortType) {
      case 'created': return a.created - b.created;
      case 'modified': return a.lastModified - b.lastModified;
      case 'orgPath': return a.recycleBinData!.orgPath.localeCompare(b.recycleBinData!.orgPath, undefined, { numeric: true, sensitivity: 'base' });
      case 'deleted': return a.recycleBinData!.deleted - b.recycleBinData!.deleted;
      case 'name':
      default:
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    }
  })
  if (sortReverse) files.reverse();
  const fileNames = files.map(f => f.name);

  for (let file of files) {
    const div = document.createElement('div');
    div.classList.add('file');
    div.dataset.name = file.name;
    flagment.appendChild(div);

    const nameOuterDiv = document.createElement('div');
    nameOuterDiv.classList.add('name-outer');
    if (selectedFiles.has(file.name)) nameOuterDiv.classList.add('selected');
    if (currentFile === file.name) nameOuterDiv.classList.add('current');
    nameOuterDiv.draggable = true;
    div.appendChild(nameOuterDiv);

    const nameOuterFlexDiv = document.createElement('div');
    nameOuterFlexDiv.classList.add('h-container');
    nameOuterDiv.appendChild(nameOuterFlexDiv);
   
    const iconImg = document.createElement('img');
    iconImg.src = await getIcon(file);
    iconImg.classList.add('icon');
    if (file.cut) iconImg.classList.add('cut');
    iconImg.draggable = false;
    nameOuterFlexDiv.appendChild(iconImg);
    
    const nameDiv = document.createElement('div');
    nameDiv.textContent = inRecycleBin ? file.recycleBinData!.orgName : file.name;
    nameDiv.classList.add('name');
    nameOuterFlexDiv.appendChild(nameDiv);

    for (let [col, _] of headerCols.slice(1)) {
      const colDiv = document.createElement('div');
      colDiv.classList.add(col);

      const dateFormatter = new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'});
      switch (col) {
        case 'created':
          colDiv.textContent = dateFormatter.format(new Date(file.created));
          break;
        case 'modified':
          colDiv.textContent = dateFormatter.format(new Date(file.lastModified));
          break;
        case 'orgPath':
          colDiv.textContent = file.recycleBinData!.orgPath;
          break;
        case 'deleted':
          colDiv.textContent = dateFormatter.format(new Date(file.recycleBinData!.deleted));
          break;
      }

      div.appendChild(colDiv);
    }

    if (inRecycleBin) {
      nameOuterDiv.addEventListener('contextmenu', (e) => {
        e.stopPropagation();
        api.showContextMenu(`${file.isDirectory ? 'folder' : 'file'}-${file.name}`, [
          ['restore', { label: '元に戻す' }],
          ['delete', { label: '完全に削除' }],
        ]);
      });
    } else {
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
          setCurrentPath(`${currentPath}${file.name}/`);
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
            ['delete', { label: currentPath === RECYCLE_BIN_PATH ? '完全に削除' : '削除' }],
          ]);
        });

        nameOuterDiv.addEventListener('dblclick', () => {
          api.open(currentPath, file.name);
        });
      }
    }

    nameOuterDiv.addEventListener('mousedown', (e) => {
      e.stopPropagation();

      if (e.button == 0) {
        currentFile = file.name;
        if (e.ctrlKey) {
          if (selectedFiles.has(file.name)) {
            selectedFiles.delete(file.name);
          } else {
            selectedFiles.add(file.name);
          }
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
          currentFile = file.name;
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
    const name = div.closest<HTMLElement>('.file')!.dataset.name!;

    if (selectedFiles.has(name)) {
      div.classList.add('selected');
    } else {
      div.classList.remove('selected');
    }
    if (currentFile === name) {
      div.classList.add('current');
    } else {
      div.classList.remove('current');
    }
  }
}

export function startRename(name: string = '') {
  const div = flContentsDiv.querySelector(`div[data-name="${CSS.escape(name)}"]`);
  if (!div) return;
  const nameOuterDiv = div.querySelector<HTMLElement>('.name-outer')!;
  nameOuterDiv.draggable = false;
  const nameDiv = div.querySelector('.name')!;
  nameDiv.textContent = '';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = name;
  input.spellcheck = false;
  nameDiv.appendChild(input);

  input.focus();
  const selectEnd = name.lastIndexOf('.');
  if (selectEnd > 0) input.setSelectionRange(0, selectEnd);
  else input.select();

  function endRename(cancel = false) {
    document.removeEventListener('mousedown', onMouseDown, { capture: true });
    document.removeEventListener('keydown', onKeyDown, { capture: true });

    const newName = input.value.trim();
    input.remove();

    if (cancel || newName == name || newName == '') update();
    else api.rename(currentPath, name, newName);
  }

  function onMouseDown(e: MouseEvent) {
    if (e.target !== input) endRename();
  }
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') endRename();
    else if (e.key === 'Escape') endRename(true);
    e.stopImmediatePropagation();
  }
  document.addEventListener('mousedown', onMouseDown, { capture: true });
  document.addEventListener('keydown', onKeyDown, { capture: true });

  input.addEventListener('dblclick', e => e.stopPropagation());
  input.addEventListener('contextmenu', e => e.stopPropagation());
}
api.onStartRename(async (e, name: string) => {
  await update();
  startRename(name);
});

export function deleteFiles(path: string, names: Set<string>) {
  if (path === RECYCLE_BIN_PATH) {
    api.delete(path, names);
  } else {
    api.moveToRecycleBin(path, names, RECYCLE_BIN_PATH);
  }
}

api.onOpenRecycleBin(() => setCurrentPath(RECYCLE_BIN_PATH));
