const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require("path")
const fs = require('fs')

if (require('electron-squirrel-startup')) return app.quit();

const { updateElectronApp, UpdateSourceType } = require('update-electron-app')
updateElectronApp()

let appVersion = false;
try {
    appVersion = JSON.parse(fs.readFileSync(path.join(app.getAppPath(), 'package.json'), 'utf8')).version;
} catch (error) { console.error("Error al cargar la versión en main.js:", error.message); }

let win
const createWindow = () => {
    win = new BrowserWindow({
        width: process.env.NODE_ENV === "development" ? 785 : 535,
        height: 765,
        frame: false,
        resizable: true,
        icon: __dirname + '/icons/512x512.png',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        }
    })

    win.on('blur', () => {
        win.webContents.send('window-focus-change', 'blurred');
    });
    win.on('focus', () => {
        win.webContents.send('window-focus-change', 'focused');
    });
    win.loadFile('ZplEscPrinter/main.html')
    if(process.env.NODE_ENV === "development"){
        win.webContents.openDevTools()
    }
}

ipcMain.on('select-dir', async (event, arg) => {
    const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory']
    })
    event.sender.send('selected-dir', result.filePaths)
})

ipcMain.on('select-file', async (event, arg) => {
    const result = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [{ name: 'Raw Print', extensions: ['raw', 'bin', 'txt', 'print'] }]
    })
    event.sender.send('selected-file', result.filePaths)
})

ipcMain.on('get-app-version', (event) => {
    event.reply('app-version-response', appVersion)
})

app.whenReady().then(() => {
    createWindow()
})
