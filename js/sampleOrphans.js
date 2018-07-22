const shell = require('shelljs')
const x2jsLib = require('x2js')
const json2xml = require('json2xml')
const x2js = new x2jsLib()

const DELUGE_PATHS = ["SONGS", "KITS", "SYNTHS"]
const SAMPLES_PATH = "SAMPLES"
const RED = '\x1b[31m%s\x1b[0m'

/*
FgBlack = "\x1b[30m"
FgRed = "\x1b[31m"
FgGreen = "\x1b[32m"
FgYellow = "\x1b[33m"
FgBlue = "\x1b[34m"
FgMagenta = "\x1b[35m"
FgCyan = "\x1b[36m"
FgWhite = "\x1b[37m"
*/

function dirCheck() {
    // dev hack..
    if (shell.test('-d', shell.pwd() + "/../SONGS")) {
        shell.cd('../');
        console.log('Change directory to Deluge root');
    }
    // end dev hack

    // check if folders assumed in app are here
    let missingDirs = []
    DELUGE_PATHS.concat(SAMPLES_PATH).forEach(function(path) {
        if (shell.test('-d', shell.pwd() + "/" + path) === false) {
            missingDirs.push(path)
        }
    })

    if (missingDirs.length != 0) {
        console.log(RED, "Beware: Some Deluge folders are missing: " + missingDirs.join(","))
        shell.exit()
    }
}

let delugeXmls = {}
let total = 0
let missing = {}
let missingCnt = 0





function run() {
    dirCheck()
    DELUGE_PATHS.forEach(function(path) {
        let samples = parseFilenames(path)
        console.log("Processing " + path + " files")
        checkFiles(samples)

    })
    printResults()
}


function printResults() {
    console.log(RED, "Missing samples")
    console.log(missing)
    console.log("total " + total + ", missing " + missingCnt)
    console.log(delugeXmls)
}



function findSample(path) {
    let result = null
    let parts = path.split("/")
    //shell.echo(shell.pwd())
    let matches = shell.find(SAMPLES_PATH).filter(function(file) {
        return file.match(parts[parts.length - 1]);
    });
    if (matches && matches[0]) {
        if (matches.length != 1) {
            // try to match parent folder too
            matches = shell.find(SAMPLES_PATH).filter(function(file) {
                return file.match(parts[parts.length - 2] + '/' + parts[parts.length - 1]);
            });
        }
    }

    if (matches && matches.length == 1) {
        result = matches[0]
    } else {
        //console.log("Could not find match for "+path)
    }
    //console.log("result: path "+trimSamplesPath(path)+" goes to " + result)
    return result
}

function trimSamplesPath(path) {
    result = path.replace(shell.pwd(), "")
    let parts = path.split("/")
    parts.reverse().forEach(function(part, index) {
        if (part == SAMPLES_PATH) {
            result = parts.slice(0, index).reverse()
        }
    })
    return SAMPLES_PATH + "/" + result.join("/")
}

function parseFilenames(dirName) {
    let samples = {}
    shell.find(dirName + "/").filter(function(file) {
        if (file.match(/\.XML$/) != null) {
            let fileName = String(file)
            let data = String(shell.cat(file))
            let obj = toJson(data)

            if (delugeXmls[dirName]) {
                delugeXmls[fileName].push(obj)
            } else {
                delugeXmls[fileName] = [obj]
            }

            extractFileNames(obj, samples, fileName)
        }
    });
    return samples

}


function checkFiles(entries) {
    for (let song in entries) {

        let paths = entries[song]
        paths.forEach(function(path) {

            total++
            path = __dirname + "/../" + path

            if (!shell.test('-f', path)) {
                missingCnt++
                if (missing[song]) {
                    console.log("look for " + path)
                    let found = findSample(path)
                    missing[song].push({
                        'path': path,
                        'found': found
                    })
                } else {
                    missing[song] = [{
                        'path': path,
                        'found': null
                    }]
                }

            } else {

            }

        })
        console.log("checkFiles done")
     
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


module.exports =  run