import { currentPath, setCurrentPath } from "./manager.js";

const flBackgroundDiv = document.getElementById('fl-background')!;
const flContentsDiv = document.getElementById('fl-contents')!;

flBackgroundDiv.addEventListener('contextmenu', (e) => {
  if (!api.isOpen()) return;

  api.showContextMenu('background', [
    ['newFile', { label: 'ファイルを作成' }],
    ['newFolder', { label: 'フォルダを作成' }],
    ['uploadFile', { label: 'ファイルをアップロード' }],
    ['uploadFolder', { label: 'フォルダをアップロード' }],
    ['', { type: 'separator' }],
    ['paste', { label: '貼り付け' }],
  ]);
});

export async function update() {
  flContentsDiv.innerHTML = '';
  if (!api.isOpen()) return;

  const files = await api.getFiles(currentPath);
  for (let file of files) {
    const div = document.createElement('div');
    flContentsDiv.appendChild(div);

    const nameDiv = document.createElement('div');
    nameDiv.textContent = file.name;
    nameDiv.classList.add('name');
    div.appendChild(nameDiv);

    const createdDiv = document.createElement('div');
    createdDiv.textContent = new Date(file.created).toLocaleString();
    createdDiv.classList.add('created');
    div.appendChild(createdDiv);

    const modifiedDiv = document.createElement('div');
    modifiedDiv.textContent = new Date(file.lastModified).toLocaleString();
    modifiedDiv.classList.add('modified');
    div.appendChild(modifiedDiv);

    if (file.isDirectory) {
      nameDiv.addEventListener('contextmenu', (e) => {
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

      nameDiv.addEventListener('dblclick', () => {
        setCurrentPath(currentPath + `${file.name}/`);
      });
    } else {
      nameDiv.addEventListener('contextmenu', (e) => {
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

      nameDiv.addEventListener('dblclick', () => {
        api.open(currentPath, file.name);
      });
    }
  }
}
api.onUpdate(update);

api.onChangeLFFolder(() => {
  setCurrentPath('/');
});
