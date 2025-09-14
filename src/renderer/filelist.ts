import { currentPath, setCurrentPath } from "./manager.js";

const filelistDiv = document.getElementById('filelist')!;
filelistDiv.addEventListener('contextmenu', (e) => {
  if (!api.isOpen()) return;

  api.showContextMenu('background', [
    ['newFile', { label: 'ファイルを作成' }],
    ['newFolder', { label: 'フォルダを作成' }],
    ['', { type: 'separator' }],
    ['paste', { label: '貼り付け' }],
  ]);
});

export async function update() {
  filelistDiv.innerHTML = '';
  if (!api.isOpen()) return;

  const files = await api.getFiles(currentPath);
  for (let file of files) {
    const div = document.createElement('div');
    div.textContent = file.name;
    filelistDiv.appendChild(div);

    if (file.isDirectory) {
      div.addEventListener('contextmenu', (e) => {
        e.stopPropagation();
        api.showContextMenu(`folder-${file.name}`, [
          ['cut', { label: '切り取り' }],
          ['copy', { label: 'コピー' }],
          ['', { type: 'separator' }],
          ['rename', { label: '名前を変更' }],
          ['delete', { label: '削除' }],
        ]);
      });

      div.addEventListener('dblclick', () => {
        setCurrentPath(currentPath + `${file.name}/`);
      });
    } else {
      div.addEventListener('contextmenu', (e) => {
        e.stopPropagation();
        api.showContextMenu(`file-${file.name}`, [
          ['open', { label: '開く' }],
          ['', { type: 'separator' }],
          ['cut', { label: '切り取り' }],
          ['copy', { label: 'コピー' }],
          ['', { type: 'separator' }],
          ['rename', { label: '名前を変更' }],
          ['delete', { label: '削除' }],
        ]);
      });

      div.addEventListener('dblclick', () => {
        api.open(currentPath, file.name);
      });
    }
  }
}
api.onUpdate(update);

api.onChangeLFFolder(() => {
  setCurrentPath('/');
});
