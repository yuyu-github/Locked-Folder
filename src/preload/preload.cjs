const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  showContextMenu: (...params) => ipcRenderer.invoke('showContextMenu', ...params),
  getFiles: (...params) => ipcRenderer.invoke('getFiles', ...params),

  onContextMenuClick: callback => ipcRenderer.on('contextMenuClick', callback),
  onChangeLFFolder: callback => ipcRenderer.on('changeLFFolder', callback),
});
