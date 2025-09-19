import { files, flBackgroundDiv, selectedFiles, selectedUpdate } from "./filelist.js";
import { currentPath } from "./manager.js";

function onContextMenuClick(e, caller, id) {
  switch (id) {
    case 'newFile': {
      api.newFile(currentPath);
      break;
    }
    case 'newFolder': {
      api.newFolder(currentPath);
      break;
    }
    case 'uploadFile': {
      api.uploadFile(currentPath);
      break;
    }
    case 'uploadFolder': {
      api.uploadFolder(currentPath);
      break;
    }
    case 'download': {
      api.download(currentPath, selectedFiles);
      break;
    }
    case 'open': {
      const name = caller.replace(/^(file|folder)-/, '');
      api.open(currentPath, name);
      break;
    }
    case 'cut': {
      api.cut(currentPath, selectedFiles);
      break;
    }
    case 'copy': {
      api.copy(currentPath, selectedFiles);
      break;
    }
    case 'paste': {
      api.paste(currentPath);
      break;
    }
    case 'rename': {
      const name = caller.replace(/^(file|folder)-/, '');
      api.rename(currentPath, name);
      break;
    }
    case 'delete': {
      api.delete(currentPath, selectedFiles);
      break;
    }
  }
};
api.onContextMenuClick(onContextMenuClick);

document.addEventListener('keydown', (e) => {
  const ctrl = navigator.userAgent.toLowerCase().includes('mac') ? e.metaKey : e.ctrlKey;
  const key = e.key.toLowerCase()
  
  if (ctrl && key == 'a') {
    for (let i of files) selectedFiles.add(i.name);
    selectedUpdate();
    e.preventDefault();
  } else if (ctrl && e.shiftKey && key === 'n') {
    api.newFolder(currentPath);
    e.preventDefault();
  } else if (ctrl && key === 'n') {
    api.newFile(currentPath);
    e.preventDefault();
  } else if (ctrl && e.shiftKey && key === 'u') {
    api.uploadFolder(currentPath);
    e.preventDefault();
  } else if (ctrl && key === 'u') {
    api.uploadFile(currentPath);
    e.preventDefault();
  } else if (ctrl && key === 'd' && selectedFiles.size > 0) {
    api.download(currentPath, selectedFiles);
    e.preventDefault();
  } else if (ctrl && key === 'x' && selectedFiles.size > 0) {
    api.cut(currentPath, selectedFiles);
    e.preventDefault();
  } else if (ctrl && key === 'c' && selectedFiles.size > 0) {
    api.copy(currentPath, selectedFiles);
    e.preventDefault();
  } else if (ctrl && key === 'v') {
    api.paste(currentPath);
    e.preventDefault();
  } else if (key == 'enter' && selectedFiles.size > 0) {
    api.open(currentPath, Array.from(selectedFiles).at(-1)!);
    e.preventDefault();
  } else if (key === 'f2' && selectedFiles.size > 0) {
    api.rename(currentPath, Array.from(selectedFiles).at(-1)!);
    e.preventDefault();
  } else if (key === 'delete' && selectedFiles.size > 0) {
    api.delete(currentPath, selectedFiles);
    e.preventDefault();
  }
});

flBackgroundDiv.addEventListener('dragover', (e) => {
  e.preventDefault();
});

flBackgroundDiv.addEventListener('drop', async (e) => {
  e.preventDefault();

  if (api.isOpen()) {

  } else {
    console.log(e.dataTransfer?.files)
    if (e.dataTransfer?.files.length === 0) return;
    const path = api.getPathForFile(e.dataTransfer!.files[0]!);
    api.openLFFolder(path);
  }
});
