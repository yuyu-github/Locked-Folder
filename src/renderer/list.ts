import { currentPath, setCurrentPath } from "./manager.js";

const listDiv = document.getElementById('list')!;
listDiv.addEventListener('contextmenu', (e) => {
  if (!api.isOpen()) return;

  api.showContextMenu('background', [
    ['newFile', { label: 'ファイルを作成' }],
    ['newFolder', { label: 'フォルダを作成' }],
    ['', { type: 'separator' }],
    ['paste', { label: '貼り付け' }],
  ]);
});

async function refresh() {
  if (!api.isOpen()) {
    listDiv.innerHTML = '';
    return;
  }

  const files = await api.getFiles(currentPath);
  listDiv.innerHTML = '';
  for (let file of files) {
    const div = document.createElement('div');
    div.textContent = file.name;
    listDiv.appendChild(div);

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
        refresh();
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
api.onRefresh(refresh);

api.onChangeLFFolder(() => {
  setCurrentPath('/');
  refresh();
});
