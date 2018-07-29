const { app, BrowserWindow } = require('electron')
const path = require('path')

const isDev = true //true

if (isDev) require('electron-reload')(__dirname)
let mainWindow = null

app.once('ready', (document) => {

    mainWindow = new BrowserWindow({ width: 1500, height: 800 })
    mainWindow.loadFile('main.html')
    if (isDev) mainWindow.webContents.openDevTools()

})

app.on('window-all-closed', function() {
    app.quit();
});