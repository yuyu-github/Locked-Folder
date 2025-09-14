let currentPath = '/';

const listDiv = document.getElementById('list')!;
listDiv.addEventListener('contextmenu', (e) => {
  if (!api.isOpen()) return;

  api.showContextMenu('background', [
    ['newFile', { label: 'ファイルを作成' }],
    ['newFolder', { label: 'フォルダを作成' }],
  ]);
});

api.onContextMenuClick((e, caller, id) => {
  switch (id) {
    case 'newFile': {
      api.newFile(currentPath);
      break;
    }
    case 'newFolder': {
      api.newFolder(currentPath);
      break;
    }
    case 'rename': {
      const filename = caller.split('-')[1];
      api.rename(currentPath, filename);
      break;
    }
    case 'delete': {
      const filename = caller.split('-')[1];
      api.delete(currentPath, filename);
      break;
    }
  }
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

    div.addEventListener('contextmenu', (e) => {
      e.stopPropagation();
      api.showContextMenu(`file-${file.name}`, [
        ['rename', { label: '名前を変更' }],
        ['delete', { label: '削除' }],
      ]);
    });

    if (file.isDirectory) {
      div.addEventListener('dblclick', () => {
        currentPath += `/${file.name}`;
        refresh();
      });
    }
  }
}
api.onChangeLFFolder(refresh);
