import { updateAddressbar } from './addressbar.js';
import { update } from './filelist.js';

export let currentPath = '/';

export function setCurrentPath(path: string) {
  if (!path.startsWith('/')) path = `/${path}`;
  if (!path.endsWith('/')) path += '/';
  currentPath = path;
  update();
  updateAddressbar();
}
