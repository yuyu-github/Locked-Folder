const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mainApi', {

})
