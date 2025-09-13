import { app } from 'electron';

import './ipc';
import { createMainWindow, mainWindow } from './window';

createMainWindow();

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
