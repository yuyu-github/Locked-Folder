import { selectedFiles } from "./filelist.js";
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
});
