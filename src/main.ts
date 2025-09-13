import { app } from 'electron';

import "./ipc.js";
import { createMainWindow, mainWindow } from "./window.js";

app.on("ready", () => {
  createMainWindow();
});

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
