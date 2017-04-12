const { clipboard, app, BrowserWindow, ipcMain } = require('electron') //这是一种解构
const electron = require('electron')
const http = require('http')
const macaddress = require('macaddress')
const path = require('path')
const url = require('url')


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let loginWindow, mainWindow, subWin, listWin, listeningWin, captureWin, captureSubWin
let winWidth = 800
const winHeight = 24

macaddress.one((err, mac) => {
    console.log("Mac address for this host: %s", mac)
    global.mac_addr = mac
})

function createTopLoginWindow() {
    //get the screen size
    let electronScreen = electron.screen;
    const { width, height } = electronScreen.getPrimaryDisplay().workAreaSize;
    winWidth = width
    // Create the browser window.
    loginWindow = new BrowserWindow({ alwaysOnTop: true, maximizable: false, useContentSize: true, closable: true, minimizable: true, fullscreenable: false, frame: true })

    loginWindow.setSize(600, 400, true)
    //set the win location on the top
    loginWindow.setPosition(0, 0, true)
    // and load the login.html of the app.
    loginWindow.loadURL(`file://${__dirname}/login.html`)


    // 打开开发调试工具
    loginWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    loginWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        loginWindow = null
    })
}

function createListeningWindow() {
    if (listeningWin == null || listeningWin == undefined) {
        listeningWin = new BrowserWindow({ alwaysOnTop: false, openDevTools: false, modal: false, frame: true })
        listeningWin.loadURL(url.format({
            pathname: path.join(__dirname, 'listening.html'),
            protocol: 'file:',
            slashes: true
        }))
        listeningWin.openDevTools()

        listeningWin.setSize(400, 400, false)
        listeningWin.on('closed', () => {
            listeningWin = null
        })
    }
}
function createOrShowListWin() {
    let { x, y, width: w, height: h } = mainWindow.getBounds()
    if (listWin == null || listWin == undefined) {
        listWin = new BrowserWindow({ alwaysOnTop: true, openDevTools: true, modal: false, frame: false })
        listWin.loadURL(url.format({
            pathname: path.join(__dirname, 'index.part2.html'),
            protocol: 'file:',
            slashes: true
        }))




        listWin.setPosition(x, y + h)

        if (process.platform === "win32") {
            mainWindow.on("move", (event) => {
                let { x: xx, y: yy, width: ww, height: hh } = event.sender.getBounds()
                listWin.setPosition(xx, yy + hh)
            })
        }


        listWin.setSize(w, 400, true)

        listWin.webContents.on('did-finish-load', (event, args) => {
            listWin.webContents.send('init-size', [w, 400])
        })

        listWin.openDevTools()

        listWin.on('resize', () => {
            let [w, h] = listWin.getContentSize()
            listWin.webContents.send('resize', h)
        })
        listWin.on('closed', () => {
            listWin = null
        })
    } else {
        if (listWin.isVisible()) {
            listWin.hide()
        } else {
            listWin.show()
        }
    }
}

ipcMain.on('capture', (event, obj) => {
    subWin.hide()
    createCaptureWin()
})
ipcMain.on('open_capturesubwin', (event, arg) => {
    captureWin.hide()
    createCaptureSubWin()
})

ipcMain.on('capture_finish', (event, arg) => {
    captureSubWin.capturePage(arg, function (image) {
        console.log(arg)

        clipboard.writeImage(image)
        // localStorage['img_capture'] = image
        subWin.webContents.send('capture_finish', 'img_capture')
        if (captureWin) {
            captureWin.close()
        }
        if (captureSubWin) {
            captureSubWin.close()
        }
    })
})

function createCaptureWin() {
    let electronScreen = electron.screen;
    const { width, height } = electronScreen.getPrimaryDisplay().workAreaSize;
    captureWin = new BrowserWindow({ width: width, height: height, transparent: true, alwaysOnTop: true, openDevTools: true, modal: false, frame: false })
    captureWin.loadURL(url.format({
        pathname: path.join(__dirname, 'capture.html'),
        protocol: 'file:',
        slashes: true
    }))

    captureWin.webContents.openDevTools()

    captureWin.on('closed', () => {
        captureWin = null
        if (captureSubWin) {
            captureSubWin.close()
        }
    })
}

function createCaptureSubWin() {
    let electronScreen = electron.screen;
    const { width, height } = electronScreen.getPrimaryDisplay().workAreaSize;
    captureSubWin = new BrowserWindow({ width: width, height: height, transparent: false, alwaysOnTop: true, openDevTools: true, modal: false, frame: false })
    captureSubWin.loadURL(url.format({
        pathname: path.join(__dirname, 'capture.sub.html'),
        protocol: 'file:',
        slashes: true
    }))

    captureSubWin.webContents.openDevTools()

    captureSubWin.on('closed', () => {
        captureSubWin = null
        if (captureWin) {
            captureWin.close()
        }
    })
}
ipcMain.on("expand", (event, arg) => {
    console.log(arg)
    createOrShowListWin()
})

ipcMain.on("message_arrived", (event, msg) => {
    mainWindow.webContents.send('message_arrived', msg)
})

// 打开报修填写界面
ipcMain.on('open_baoxiuwin', (event, arg) => {
    if (subWin === undefined || subWin === null) {
        let baoxiuwin = new BrowserWindow({ alwaysOnTop: true, openDevTools: true, modal: true })
        baoxiuwin.webContents.openDevTools()
        let winRectangle = mainWindow.getBounds()
        baoxiuwin.setPosition(winRectangle.x, winRectangle.y + winRectangle.height)


        baoxiuwin.loadURL(url.format({
            pathname: path.join(__dirname, 'baoxiu.html'),
            protocol: 'file:',
            slashes: true
        }))

        subWin = baoxiuwin
        subWin.on('closed', () => {
            baoxiuwin = subWin = null
        })
    } else {
        subWin.show()
    }
})

ipcMain.on('open_setting_process', (event, arg) => {
    if (subWin === undefined || subWin === null) {
        let processSettingWin = new BrowserWindow({ alwaysOnTop: true })
        processSettingWin.webContents.openDevTools()
        let winRectangle = mainWindow.getBounds()
        processSettingWin.setPosition(winRectangle.x, winRectangle.y + winRectangle.height)

        processSettingWin.loadURL(url.format({
            pathname: path.join(__dirname, 'processdefine.html'),
            protocol: 'file:',
            slashes: true
        }))

        subWin = processSettingWin
        subWin.on('closed', () => {
            processSettingWin = subWin = null
        })
    } else {
        subWin.show()
    }
})

function loginSuccess(user) {
    mainWindow = new BrowserWindow({
        width: winWidth, height: winHeight, alwaysOnTop: true, maximizable: false, useContentSize: true, closable: true, minimizable: true, fullscreenable: false, frame: true, resizable: false,
        skipTaskbar: true
    })

    mainWindow.setPosition(0, 0, true)

    mainWindow.openDevTools()
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    let outargs = user
    global.user = user
    mainWindow.webContents.on('did-finish-load', (event, args) => {
        mainWindow.webContents.send('init', outargs)
    })
    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}

ipcMain.on('quit', (event, arg) => {
    console.log(arg)
    let wins = BrowserWindow.getAllWindows()
    for (let i = 0; i < wins.length; i++) {
        wins[i].close()
    }
})

ipcMain.on("qyqq_relogin", (event, arg) => {
    console.log(arg)
    mainWindow.setSize(800, 600, true)

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'login.html'),
        protocol: 'file:',
        slashes: true
    }))
})









// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', (event, arg) => {
    startup()
})

function startup() {

    //The url we want is: 'www.random.org/integers/?num=1&min=1&max=10&col=1&base=10&format=plain&rnd=new'
    var options = {
        host: 'it.canature.com',
        port: 8989,
        path: `/v1/org/getuser?mac_addr=${global.mac_addr}`
    }

    callback = (response) => {

        //another chunk of data has been recieved, so append it to `str`
        response.on('data', (ret) => {
            ret = ret + ''
            // ret= JSON.stringify(ret)
            ret = JSON.parse(ret)
            console.log(ret)
            createTopLoginWindow()

            if (!listWin) {
                //有可能不是第一次启动 有可能是再激活(mac osx)
                createListeningWindow()
            }
            if (ret.ReturnCodeMap[ret.ReturnCode] == 'ok') {
                if (loginWindow) {
                    loginWindow.close()
                }
                loginSuccess(ret.ReturnResult)
            }
        })

        //the whole response has been recieved, so we just print it out here
        response.on('end', () => {
            console.log('启动完成....')
        })
    }

    http.request(options, callback).end();
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        startup()
    }
})