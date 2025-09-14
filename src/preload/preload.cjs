const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  isOpen: () => ipcRenderer.sendSync('isOpen'),
  showContextMenu: (...params) => ipcRenderer.invoke('showContextMenu', ...params),
  getFiles: (...params) => ipcRenderer.invoke('getFiles', ...params),
  newFile: (...params) => ipcRenderer.invoke('newFile', ...params),
  newFolder: (...params) => ipcRenderer.invoke('newFolder', ...params),
  open: (...params) => ipcRenderer.invoke('open', ...params),
  cut: (...params) => ipcRenderer.invoke('cut', ...params),
  copy: (...params) => ipcRenderer.invoke('copy', ...params),
  paste: (...params) => ipcRenderer.invoke('paste', ...params),
  rename: (...params) => ipcRenderer.invoke('rename', ...params),
  delete: (...params) => ipcRenderer.invoke('delete', ...params),

  onContextMenuClick: callback => ipcRenderer.on('contextMenuClick', callback),
  onChangeLFFolder: callback => ipcRenderer.on('changeLFFolder', callback),
  onRefresh: callback => ipcRenderer.on('refresh', callback),
});
