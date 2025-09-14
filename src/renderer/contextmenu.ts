import { currentPath } from "./manager.js";

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
    case 'uploadFile': {
      api.uploadFile(currentPath);
      break;
    }
    case 'uploadFolder': {
      api.uploadFolder(currentPath);
      break;
    }
    case 'download': {
      const name = caller.replace(/^(file|folder)-/, '');
      api.download(currentPath, name);
      break;
    }
    case 'open': {
      const name = caller.replace(/^(file|folder)-/, '');
      api.open(currentPath, name);
      break;
    }
    case 'cut': {
      const name = caller.replace(/^(file|folder)-/, '');
      api.cut(currentPath, name);
      break;
    }
    case 'copy': {
      const name = caller.replace(/^(file|folder)-/, '');
      api.copy(currentPath, name);
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
      const name = caller.replace(/^(file|folder)-/, '');
      api.delete(currentPath, name);
      break;
    }
  }
});
