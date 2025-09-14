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
    case 'open': {
      const name = caller.split('-')[1];
      api.open(currentPath, name);
      break;
    }
    case 'cut': {
      const name = caller.split('-')[1];
      api.cut(currentPath, name);
      break;
    }
    case 'copy': {
      const name = caller.split('-')[1];
      api.copy(currentPath, name);
      break;
    }
    case 'paste': {
      api.paste(currentPath);
      break;
    }
    case 'rename': {
      const name = caller.split('-')[1];
      api.rename(currentPath, name);
      break;
    }
    case 'delete': {
      const name = caller.split('-')[1];
      api.delete(currentPath, name);
      break;
    }
  }
});
