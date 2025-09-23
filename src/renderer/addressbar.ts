import { RECYCLE_BIN_PATH, selectedFiles } from "./filelist.js";
import { currentPath, setCurrentPath } from "./manager.js";

const addressbarDiv = document.getElementById('addressbar')!;

export function updateAddressbar() {
  addressbarDiv.innerHTML = '';
  if (!api.isOpen()) return;

  const parts = currentPath.split('/')
  if (!parts.at(-1)) parts.pop();

  let stack = '/';
  for (let i = 0; i < parts.length; i++) {
    if (i !== 0) {
      const sepDiv = document.createElement('div');
      sepDiv.textContent = '>';
      sepDiv.className = 'sep';
      addressbarDiv.appendChild(sepDiv);
      stack += parts[i] + '/';
    }

    const path = stack;

    const nameDiv = document.createElement('div');
    if (i === 0) {
      nameDiv.className = 'root-slash';
      nameDiv.textContent = '/';
    } else if (path === RECYCLE_BIN_PATH) {
      nameDiv.textContent = 'ごみ箱';
    } else {
      nameDiv.textContent = parts[i];
    }
    addressbarDiv.appendChild(nameDiv);

    nameDiv.addEventListener('click', () => {
      setCurrentPath(path);
    });

    nameDiv.addEventListener('dragover', (e) => {
      if (e.dataTransfer!.types.includes('Files')) {
        e.dataTransfer!.dropEffect = 'copy';
      } else {
        if (currentPath == path) return;
        e.dataTransfer!.dropEffect = 'move';
      }
      e.preventDefault();
      nameDiv.classList.add('drop-target');
    });

    nameDiv.addEventListener('dragleave', (e) => {
      nameDiv.classList.remove('drop-target');
    });

    nameDiv.addEventListener('drop', (e) => {
      if (e.dataTransfer?.files.length !== 0) {
        const filepaths = Array.from(e.dataTransfer!.files).map(i => api.getPathForFile(i));
        api.uploadFile(path, filepaths)
      } else {
        if (currentPath == path) return;
        api.move(currentPath, selectedFiles, path);
      }

      e.preventDefault();
      e.stopPropagation();
      nameDiv.classList.remove('drop-target');
    });
  }
}
