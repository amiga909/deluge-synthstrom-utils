const fs = require("fs"),
    path = require("path");
const x2jsLib = require('x2js')
const x2js = new x2jsLib()


const NOTE_MAP = [{
    str: "C#",
    offset: 1
}, {
    str: "C",
    offset: 0
}, {
    str: "D#",
    offset: 3
}, {
    str: "D",
    offset: 2
}, {
    str: "E",
    offset: 4
}, {
    str: "F#",
    offset: 6
}, {
    str: "F",
    offset: 5
}, {
    str: "G#",
    offset: 8
}, {
    str: "G",
    offset: 7
}, {
    str: "A#",
    offset: 10
}, {
    str: "A",
    offset: 9
}, {
    str: "B",
    offset: 11
}, ]

function formatXml(xml) {

    var formatted = '';
    const reg = /(>)(<)(\/*)/g;
    xml = xml.replace(reg, '$1\r\n$2$3');
    let pad = 0;
    const splitted = xml.split('\r\n');
    splitted.forEach(function(node, index) {
        let indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
            indent = 0;
        } else if (node.match(/^<\/\w/)) {
            if (pad != 0) {
                pad -= 1;
            }
        } else if (node.match(/^<\w([^>]*[^\/])?>.*$/)) {
            indent = 1;
        } else {
            indent = 0;
        }

        let padding = '';
        for (let i = 0; i < pad; i++) {
            padding += '  ';
        }

        formatted += padding + node + '\r\n';
        pad += indent;
    });

    return formatted;
}

function toXml(json) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + formatXml(x2js.js2xml(json));
}

function getDelugeParamValue(index) {
    const params = ['0x80000000', '0x851EB851', '0x8A3D70A2', '0x8F5C28F3', '0x947AE144', '0x99999995', '0x9EB851E6', '0xA3D70A37', '0xA8F5C288', '0xAE147AD9', '0xB333332A', '0xB851EB7B', '0xBD70A3CC', '0xC28F5C1D', '0xC7AE146E', '0xCCCCCCBF', '0xD1EB8510', '0xD70A3D61', '0xDC28F5B2', '0xE147AE03', '0xE6666654', '0xEB851EA5', '0xF0A3D6F6', '0xF5C28F47', '0xFAE14798', '0x00000000', '0x051EB83A', '0x0A3D708B', '0x0F5C28DC', '0x147AE12D', '0x1999997E', '0x1EB851CF', '0x23D70A20', '0x28F5C271', '0x2E147AC2', '0x33333313', '0x3851EB64', '0x3D70A3B5', '0x428F5C06', '0x47AE1457', '0x4CCCCCA8', '0x51EB84F9', '0x570A3D4A', '0x5C28F59B', '0x6147ADEC', '0x6666663D', '0x6B851E8E', '0x70A3D6DF', '0x75C28F30', '0x7AE14781', '0x7FFFFFD2']

    return params[index] ? params[index] : params[0];
}



exports.getDelugeReleaseTime = function(category) {


  


    const DEFAULTS = [{
        name: "default",
        index: 10,
        match: []
    }, {
        name: "bass",
        index: 8,
        match: ["bas"]
    }, {
        name: "bassShort",
        index: 1,
        match: ["arp", "prc"]
    }, {
        name: "lead",
        index: 15,
        match: ["led", "key"]
    }, {
        name: "pad",
        index: 26,
        match: ["pad", "amb", "str", "vox"]
    }, {
        name: "fx",
        index: 18,
        match: []
    }, ]
    let index = 0;
    for (let m of DEFAULTS) {
        if (m.match.includes(category.toLowerCase())) {
                index = m.index;
                break;
            }
        }
    
    const delugeValue = getDelugeParamValue(index);
    //console.log("delugeValue", delugeValue, " cat", category);
    return delugeValue
}

exports.toJson = function(xml) {
    // cannot parse xml version statement :p
    xml = xml.replace(/<\?xml .*\?>/, '')
    // one root tag allowed, use wrapper
    const json = x2js.xml2js('<wrap>' + xml + '</wrap>').wrap
    return json
}

exports.writeXmlFile = function(json, fileName) {
    const xml = toXml(json)
    console.log("write", fileName + ".XML");
    fs.writeFileSync(fileName + ".XML", xml, 'utf8')
}

exports.getMidiNoFromFilename = function(fileName, commonSubstring) {
    let midiNo = 0;
    let name = fileName.replace(".wav", "")
    name = name.replace(commonSubstring, "")
    const octaveReg = new RegExp(/[0-9]{1}/);
    const match = octaveReg.exec(name);
    const octave = parseInt(match[0], 10) + 1

    let found = null;
    for (let m of NOTE_MAP) {

        if (name.includes(m.str)) {
            found = m;
            break;
        }
    }
    midiNo = (octave * 12) + found.offset;
    // console.log(name, octave, midiNo)
    return midiNo;

}

exports.getMidiNoFromFilenameLoopop = function(fileName) {
    let name = fileName.replace(".wav", "")
    const noteRegex = new RegExp(/-[0-9]{2}-/);
    const match = noteRegex.exec(name);
    let midiNo = parseInt(match[0].replace("-", ""), 10) 
   
    return midiNo;

}

