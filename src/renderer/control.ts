import { deleteFiles, files, flBackgroundDiv, RECYCLE_BIN_PATH, selectedFiles, selectedUpdate, startRename } from "./filelist.js";
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
      api.uploadFileUI(currentPath);
      break;
    }
    case 'uploadFolder': {
      api.uploadFolderUI(currentPath);
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
      startRename(name);
      break;
    }
    case 'delete': {
      deleteFiles(currentPath, selectedFiles);
      break;
    }
    case 'restore': {
      api.restore(selectedFiles, RECYCLE_BIN_PATH);
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
    api.uploadFolderUI(currentPath);
    e.preventDefault();
  } else if (ctrl && key === 'u') {
    api.uploadFileUI(currentPath);
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
  } else if (key == 'escape') {
    api.cancelCut();
    e.preventDefault();
  } else if (key == 'enter' && selectedFiles.size > 0) {
    api.open(currentPath, Array.from(selectedFiles).at(-1)!);
    e.preventDefault();
  } else if (key === 'f2' && selectedFiles.size > 0) {
    startRename(Array.from(selectedFiles).at(-1)!);
    e.preventDefault();
  } else if (key === 'delete' && selectedFiles.size > 0) {
    deleteFiles(currentPath, selectedFiles);
    e.preventDefault();
  }
});

flBackgroundDiv.addEventListener('dragover', (e) => {
  if (e.dataTransfer?.types.includes('Files')) {
    e.preventDefault();
  }
});

flBackgroundDiv.addEventListener('drop', async (e) => {
  e.preventDefault();
  
  if (e.dataTransfer?.files.length === 0) return;
  if (api.isOpen()) {
    const filepaths = Array.from(e.dataTransfer!.files).map(i => api.getPathForFile(i));
    api.uploadFile(currentPath, filepaths)
  } else {
    const path = api.getPathForFile(e.dataTransfer!.files[0]!);
    api.openLFFolder(path);
  }
});
