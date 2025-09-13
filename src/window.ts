import { BrowserWindow, Menu, MenuItemConstructorOptions } from "electron";
import path from 'path';
import { env } from 'process';
import { createNewLFFolder, openLFFolder } from "./manager.js";

export let mainWindow: BrowserWindow | null;

export function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    title: "Locked Folder",
    webPreferences: {
      preload: path.join(__dirname, "preload/preload.cjs"),
    },
  });

  const menuData: MenuItemConstructorOptions[] = [
    {
      label: "ファイル",
      submenu: [
        {
          label: "新規作成",
          click: createNewLFFolder,
          accelerator: "CommandOrControl+N",
        },
        {
          label: "開く",
          click: openLFFolder,
          accelerator: "CommandOrControl+O",
        },
      ],
    },
  ];

  if (env.TYPE == "debug") {
    menuData.push({
      label: "デバッグ",
      submenu: [
        { label: "デベロッパーツール", role: "toggleDevTools" },
        { label: "再読み込み", role: "reload" },
      ],
    });
  }

  let menu = Menu.buildFromTemplate(menuData);
  if (process.platform == "darwin") Menu.setApplicationMenu(menu);
  else mainWindow.setMenu(menu);

  mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
