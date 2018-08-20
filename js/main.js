const { getCurrentWindow, globalShortcut, BrowserWindow } = require('electron').remote
const electronShell = require('electron').shell
const path = require('path')

const terminal = require('./lib/terminal')
const SamplePathParser = require('./lib/sampleOrphans')

const BTN_COLORS = {
    'blank': 'assets/b_off.png',
    'green': 'assets/b_green.png',
    'blank_lumen': 'assets/b_off_lumen.png',
    'pink': 'assets/b_pink.png',
    'red': 'assets/b_red.png',
    'blinking': 'assets/b_blinking.gif',
}
const css = {
    "backgroundImage": ".background-image",
    "thaButton": "#button-container",
    "thaButtonImg": "#thaButton",
    "headerText": "#header-intro-text",
    "console": "#console",
    "headerTitle": "#header-title",
    "footerGithub": '#footer-github',
    "footerHelp": '#footer-help',
    "downloadReport": '#downloadReport',
    "lineActive": '.line--active'
}

let $dom = {}
let WORKING_DIR = ''


$(document).ready(() => {
    WORKING_DIR = SamplePathParser.isRootDir(log)
    if (!WORKING_DIR) {
        return false
    }
    init()
     onStart() // DEBUG
    fancyIntro()
})

function init() {
    let callbacks = {
        'onStart': onStart,
        'onReload': getCurrentWindow().reload,
        'onQuit': getCurrentWindow().close
    }
    terminal.init(callbacks)
    for (let element in css) {
        $dom[element] = $(css[element])
    }
    //$dom.lineActive.addClass('line--active-animated')

    listen()

}

function log(msg, style) {
    style = typeof style === 'undefined' ? '' : style

    if (style == 'error') {
        msg = '<span class="msg_error">' + msg + '</span>'
    } else if (style == 'success') {
        msg = '<span class="msg_success">' + msg + '</span>'
    } else if (style == 'info') {
        msg = '<span class="msg_info">' + msg + '</span>'
    } else if (style == 'debug') {
        msg = '<span class="msg_debug">' + msg + '</span>'
    }
    //msg = msg + "<br/>"
    terminal.addLine(msg)
    //$dom.console.append(msg)
}
let writeMapping = {}
function onStart() {
    $dom.lineActive.removeClass('line--active-animated')
    $dom.thaButtonImg.attr("src", BTN_COLORS.blinking)

    $("body").addClass("body-wait")
    let onSuccess = () => {
        $dom.thaButtonImg.attr("src", BTN_COLORS.green)
        $dom.headerText.slideUp(250)
        $("body").removeClass("body-wait")
        //$dom.lineActive.addClass('line--active-animated')
    }

   SamplePathParser.run(log, onSuccess)
}

function listen() {
    $dom.thaButton.on("mouseover", () => {
        $dom.thaButtonImg.attr("src", BTN_COLORS.blank_lumen)
    })
    $dom.thaButton.on("mouseout", () => {
        $dom.thaButtonImg.attr("src", BTN_COLORS.blank)
    })
    $dom.thaButton.on("click", (e) => {
        e.preventDefault()
        onStart()
        $dom.thaButton.off("click")
        $dom.thaButton.off("mouseover")
        $dom.thaButton.off("mouseout")
        $dom.thaButton.on("click", () => {
            let r = confirm("Reload App?")
            if (r === true) {
                getCurrentWindow().reload()
            }
        })
    })

    $dom.footerGithub.on("click", (e) => {
        e.preventDefault()
        electronShell.openExternal("https://github.com/amiga909/deluge-synthstrom-utils")
    })
    $dom.footerHelp.on("click", (e) => {
        e.preventDefault()
        alert("Press Command+R to reload App. Command+Q to quit.")
    })
}

function fancyIntro() {
    let setBlur = (ele, radius) => {
        $(ele).css({
            "-webkit-filter": "blur(" + radius + "px)",
            "filter": "blur(" + radius + "px)"
        });
    }

    let tweenBlur = (ele, startRadius, endRadius) => {
        $({ blurRadius: startRadius }).animate({ blurRadius: endRadius }, {
            duration: 500,
            easing: 'swing', // or "linear"
            // use jQuery UI or Easing plugin for more options
            step: () => {
                setBlur(ele, this.blurRadius)
                $dom.backgroundImage.show()
            },
            complete: () => {
                // Final callback to set the target blur radius
                // jQuery might not reach the end value
                setBlur(ele, endRadius)
            }
        })
    }
    let $content = $(".content")

    $content.hide()
    $dom.headerText.hide()
    $dom.thaButton.hide()

    window.setTimeout(() => {
        tweenBlur(css.backgroundImage, 0, 20)
    }, 100)


    window.setTimeout(() => {
        tweenBlur($dom.headerText, 20, 0)
        $content.show()
        $dom.headerText.show()
    }, 1000)

    window.setTimeout(() => {
        tweenBlur($dom.thaButton, 20, 0)

        $dom.thaButton.show()
    }, 1500)
}