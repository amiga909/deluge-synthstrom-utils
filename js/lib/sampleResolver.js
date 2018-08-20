const path = require('path')
const terminal = require('./terminal')

let WORKING_DIR = ''
let xmls = []
let curXmlIndex = -1
curSampleIndex = -1
let writeMapping = {}

exports.run = function run(dir, wM) {
    WORKING_DIR = dir
    writeMapping = wM
    terminal.addCallbacks({
        onSelect: (number) => {
            if (number > 10) {
                return false
            }
            return true
        },
        onNextXml: () => { nextXml('next') },
        onPrevXml: () => { nextXml('prev') },
    })

    let html = ''
    let count = Object.keys(writeMapping).length || 0
    if (count) {
        for (let xml in writeMapping) {
            xmls.push(xml)
            console.log(xml)
        }
        $(".header-intro").html('' + html + '')
        nextXml('next')
    }
}

function nextSample(dir = 'prev', curXml) {
    console.log(writeMapping[curXml])
    curSampleIndex = dir == 'next' ? curSampleIndex + 1 : curSampleIndex - 1
    if (curSampleIndex < 0) { curSampleIndex = writeMapping[curXml].length - 1 }
    if (curSampleIndex > writeMapping[curXml].length - 1) { curSampleIndex = 0 }

    let html = ''
    let missingSample = writeMapping[curXml][curSampleIndex]
    let key = Object.keys(missingSample)[0]
    html += "<span class='red'>" + key + "</span>"
    console.log(key)
    missingSample[key].forEach((candidate, i) => {
        html = html + "<br>" + (i + 1) + ") " + candidate + ": <br>" + renderAudio(candidate)
    })
    return "(" + (curSampleIndex + 1) + "/" + writeMapping[curXml].length + ") " + html
}

function nextXml(dir = 'prev') {
    terminal.setInteractionMode("confirmReplacements")
    curXmlIndex = dir == 'next' ? curXmlIndex + 1 : curXmlIndex - 1
    if (curXmlIndex < 0) { curXmlIndex = xmls.length - 1 }
    if (curXmlIndex > xmls.length - 1) { curXmlIndex = 0 }

    let html = ''
    let curXml = xmls[curXmlIndex]

    console.log(curXml, writeMapping[curXml])
    let missingSamples = writeMapping[curXml]

    if (missingSamples) {
        html += "--<br>"  
        html+=nextSample('next', curXml) 
          }
    
    printPage(html, curXml)

}

function printPage(html, curXml) {
    let iC = $(".terminalContent")
    if (iC != null) {
        $(".terminalContent").remove()
    }
    let res = "----<br>"
    res += "(" + (curXmlIndex + 1) + "/" + xmls.length + ") " + curXml + "<br>" + html
    res += "<br>----"
    terminal.addLine("<span class='terminalContent'>" + res + "</span>")
}

function renderAudio(p) {
    let ap = path.normalize(WORKING_DIR + p)

    return `<audio controls="controls" id="">
    <source src="${ap}" type="audio/wav" />
    </audio>`;
}

// is sample was selected, check if selection applies to other samples too.
function applyToAll() {}