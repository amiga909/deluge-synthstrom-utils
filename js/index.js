const { app, BrowserWindow } = require('electron')
const path = require('path')

require('electron-reload')(__dirname)

let mainWindow = null

app.once('ready', (document) => {
    mainWindow = new BrowserWindow({ width: 1200, height: 550 })
    mainWindow.loadFile('main.html')
    mainWindow.webContents.openDevTools()

})

app.on('window-all-closed', function() {
    app.quit();
});


/*


*/