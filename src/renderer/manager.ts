import { RECYCLE_BIN_PATH, selectedFiles, setCurrentFile, updateAll } from './filelist.js';

export let currentPath = '/';

export let backStack: string[] = [];
export let forwardStack: string[] = [];

export function setCurrentPath(path: string, stack = true) {
  if (!api.isOpen()) return;

  if (path.startsWith(RECYCLE_BIN_PATH)) path = RECYCLE_BIN_PATH;
  if (!path.startsWith('/')) path = `/${path}`;
  if (!path.endsWith('/')) path += '/';

  if (stack && currentPath !== path) {
    selectedFiles.clear();
    setCurrentFile(null);
    backStack.push(currentPath);
    forwardStack = [];
  }

  currentPath = path;
  updateAll();
}

document.getElementById('back')!.addEventListener('click', () => {
  if (backStack.length == 0) return;
  forwardStack.push(currentPath);
  setCurrentPath(backStack.pop()!, false);
});

document.getElementById('forward')!.addEventListener('click', () => {
  if (forwardStack.length == 0) return;
  backStack.push(currentPath);
  setCurrentPath(forwardStack.pop()!, false);
});

api.onChangeLFFolder((e, name: string) => {
  document.title = name ? `${name} - Locked Folder` : 'Locked Folder';
  backStack = [];
  forwardStack = [];
  setCurrentPath('/');
});
