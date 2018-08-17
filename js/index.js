const { app, BrowserWindow, Menu } = require('electron')


const path = require('path')

const isDev = true //true

if (isDev) require('electron-reload')(__dirname)
let mainWindow = null

app.once('ready', (document) => {
	var template = [{
    label: "Application",
    submenu: [
        //{ label: "About Application", selector: "orderFrontStandardAboutPanel:" },
        { type: "separator" },
        { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }},
       
    ]}, {
    label: "Edit",
    submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
    ]}
];

Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    mainWindow = new BrowserWindow({ width: 1000, height: 800 })
    mainWindow.loadFile('main.html')
    if (isDev) mainWindow.webContents.openDevTools()
})

app.on('window-all-closed', function() {
    app.quit();
});

