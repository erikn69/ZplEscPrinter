const { app, BrowserWindow } = require('electron')

if (require('electron-squirrel-startup')) return app.quit();

const createWindow = () => {
    const win = new BrowserWindow({
        width: 535,
        height: 768,
        frame: false,
        resizable: false,
        icon: __dirname + '/icons/512x512.png',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    })

    win.loadFile('ZplPrinter/main.html')
}

app.whenReady().then(() => {
    createWindow()
})
