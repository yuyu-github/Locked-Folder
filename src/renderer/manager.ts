import { updateAddressbar } from './addressbar.js';
import { applyViewSettings, selectedFiles, update } from './filelist.js';

export let currentPath = '/';

export let backStack: string[] = [];
export let forwardStack: string[] = [];

export function setCurrentPath(path: string, stack = true) {
  if (!path.startsWith('/')) path = `/${path}`;
  if (!path.endsWith('/')) path += '/';

  if (stack && currentPath !== path) {
    selectedFiles.clear();
    backStack.push(currentPath);
    forwardStack = [];
  }
  currentPath = path;
  update();
  updateAddressbar();
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

api.onChangeLFFolder(() => {
  setCurrentPath('/');
  backStack = [];
  forwardStack = [];
  applyViewSettings();
});
