import { ipcMain, Menu, MenuItemConstructorOptions } from "electron";
import { mainWindow } from "./window.js";

ipcMain.handle(
  "showContextMenu",
  (e, data: [string, MenuItemConstructorOptions][]) => {
    const options = data.map(([id, option]) => ({
      ...option,
      click: () => {
        e.sender.send("onContextMenuClick", id);
      },
    }));
    const menu = Menu.buildFromTemplate(options);
    menu.popup({ window: mainWindow! });
  }
);
