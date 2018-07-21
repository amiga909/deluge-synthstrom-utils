const shell = require('shelljs');
const x2jsLib = require('x2js');
const json2xml = require('json2xml');
const x2js = new x2jsLib()

const DELUGE_PATHS = ["SONGS", "KITS", "SYNTHS"]


if (!shell.test('-d', shell.pwd() + "/SONGS")) {
    if (shell.test('-d', shell.pwd() + "/../SONGS")) {
        shell.cd('../');
        shell.echo('Change directory to Deluge root');
    } else {
        shell.echo('Not Deluge root folder');
    }
}

if (!shell.which('afinfo')) {
    shell.echo('You should install afinfo');
}
let samplePaths = {}
let total = 0
let missing = {}
let missingCnt = 0

DELUGE_PATHS.forEach(function(p) {
    searchDir(p)
})
console.log(missing)
console.log("total " + total + ", missing " + missingCnt)

function searchDir(dirName) {

    shell.find(dirName + "/").filter(function(file) {

        if (file.match(/\.XML$/) != null) {
            let fileName = String(file)
            let data = String(shell.cat(file))
            let obj = toJson(data)

            extractFileNames(obj, samplePaths, fileName)
        }
    });

    checkFiles()
}


function checkFiles() {
    for (let song in samplePaths) {
        let paths = samplePaths[song]
        paths.forEach(function(path) {
            total++
            path = __dirname + "/../" + path
            if (!shell.test('-f', path)) {
                missingCnt++
                if (missing[song]) {
                    missing[song].push(path)
                } else {
                    missing[song] = [path]
                }
                //console.log(__dirname + "/"+path + " does not exist!")	
            } else {

            }

        })
    }
}

function extractFileNames(obj, stack, fileName) {
    for (var property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (typeof obj[property] == "object") {
                extractFileNames(obj[property], stack, fileName);
            } else {
                if (property == 'fileName') {
                    if (!stack[fileName]) {
                        stack[fileName] = []
                    }
                    let path = String(obj[property])
                    if (path)[
                        stack[fileName].push(path)
                    ]
                }
            }
        }
    }
}


function toJson(xml) {
    // cannot parse xml version statement :p
    xml = xml.replace(/<\?xml .*\?>/, '');
    // one root tag allowed, use wrapper
    var json = x2js.xml2js('<wrap>' + xml + '</wrap>').wrap;

    return json;
}


function toXml(json) {
    json = JSON.parse(json);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + json2xml(json, "\t");
}