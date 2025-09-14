const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  isOpen: () => ipcRenderer.sendSync('isOpen'),
  showContextMenu: (...params) => ipcRenderer.invoke('showContextMenu', ...params),
  getFiles: (...params) => ipcRenderer.invoke('getFiles', ...params),
  newFile: (...params) => ipcRenderer.invoke('newFile', ...params),
  newFolder: (...params) => ipcRenderer.invoke('newFolder', ...params),

  onContextMenuClick: callback => ipcRenderer.on('contextMenuClick', callback),
  onChangeLFFolder: callback => ipcRenderer.on('changeLFFolder', callback),
});
