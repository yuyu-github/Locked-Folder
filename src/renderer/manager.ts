export let currentPath = '/';

export function setCurrentPath(path: string) {
  if (!path.startsWith('/')) path = `/${path}`;
  if (!path.endsWith('/')) path += '/';
  currentPath = path;
}
