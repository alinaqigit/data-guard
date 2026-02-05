const { app, BrowserWindow } = require("electron");
const path = require("node:path");
import started from "electron-squirrel-startup";

const BrowserWindowConfig = {
  width: 800,
  height: 600,
  webPreferences: {
    preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    webSecurity: app.isPackaged,
    nodeIntegration: false,
    contextIsolation: true,
    devTools: !app.isPackaged,
  },
  titleBarStyle: "hidden",
  ...(process.platform !== "darwin"
    ? {
        titleBarOverlay: {
          color: "rgba(0, 0, 0, 0)", // transparent,
        },
      }
    : {}),
};

function getServerPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "server", "dist", "index.js");
  } else {
    // In development, use source folder
    return path.join(app.getAppPath(), "src", "server", "dist", "index.js");
  }
}

const bakckend = __non_webpack_require__(getServerPath());
// Handle creating/removing shortcuts on Windows when installing/uninstalling.

let server;

if (started) app.quit();

const createWindow = () => {

  const serverConfig = {
    C: app.getPath("userData"),
    IS_PRODUCTION: app.isPackaged,
  };

  server = bakckend.startServer(serverConfig);

  // Create the browser window.
  const mainWindow = new BrowserWindow(BrowserWindowConfig);

  const url = app.isPackaged
    ? `file://${path.join(__dirname, "../renderer/out/index.html")}`
    : "http://localhost:8000";

  mainWindow.loadURL(url);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("quit", () => {
  if (server && server.close) {
    server.close();
  }
});
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
