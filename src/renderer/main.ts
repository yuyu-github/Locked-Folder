let currentPath = '/';

const listDiv = document.getElementById('list')!;
listDiv.addEventListener('contextmenu', () => {
  if (!api.isOpen()) return;

  api.showContextMenu([
    ['newFile', { label: 'ファイルを作成' }],
    ['newFolder', { label: 'フォルダを作成' }],
  ]);
});

api.onContextMenuClick((e, id) => {
  switch (id) {
    case 'newFile':
      api.newFile(currentPath);
      break;
    case 'newFolder':
      api.newFolder(currentPath);
      break;
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
  }
}
api.onChangeLFFolder(refresh);
