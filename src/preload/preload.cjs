const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  isOpen: () => ipcRenderer.sendSync('isOpen'),
  openLFFolder: (...params) => ipcRenderer.invoke('openLFFolder', ...params),
  showContextMenu: (...params) => ipcRenderer.invoke('showContextMenu', ...params),
  setViewSetting: (...params) => ipcRenderer.invoke('setViewSetting', ...params),
  getViewSettings: (...params) => ipcRenderer.invoke('getViewSettings', ...params),
  getFiles: (...params) => ipcRenderer.invoke('getFiles', ...params),
  newFile: (...params) => ipcRenderer.invoke('newFile', ...params),
  newFolder: (...params) => ipcRenderer.invoke('newFolder', ...params),
  uploadFileUI: (...params) => ipcRenderer.invoke('uploadFileUI', ...params),
  uploadFolderUI: (...params) => ipcRenderer.invoke('uploadFolderUI', ...params),
  uploadFile: (...params) => ipcRenderer.invoke('uploadFile', ...params),
  download: (...params) => ipcRenderer.invoke('download', ...params),
  open: (...params) => ipcRenderer.invoke('open', ...params),
  cut: (...params) => ipcRenderer.invoke('cut', ...params),
  copy: (...params) => ipcRenderer.invoke('copy', ...params),
  paste: (...params) => ipcRenderer.invoke('paste', ...params),
  cancelCut: (...params) => ipcRenderer.invoke('cancelCut', ...params),
  move: (...params) => ipcRenderer.invoke('move', ...params),
  rename: (...params) => ipcRenderer.invoke('rename', ...params),
  delete: (...params) => ipcRenderer.invoke('delete', ...params),
  getIcon: (...params) => ipcRenderer.invoke('getIcon', ...params),

  onContextMenuClick: callback => ipcRenderer.on('contextMenuClick', callback),
  onChangeLFFolder: callback => ipcRenderer.on('changeLFFolder', callback),
  onUpdate: callback => ipcRenderer.on('update', callback),

  getPathForFile: file => webUtils.getPathForFile(file),
});
