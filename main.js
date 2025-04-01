const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require("path")

if (require('electron-squirrel-startup')) return app.quit();

const { updateElectronApp, UpdateSourceType } = require('update-electron-app')
updateElectronApp()

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

app.whenReady().then(() => {
    createWindow()
})
