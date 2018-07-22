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


let delugeXmls = {}
let total = 0
let missing = {}
let missingCnt = 0
let existingSamples = {}
let usedSamples = {}
let $console = null
let existingUnique = {} 




exports.run = function run(log) {
    DELUGE_PATHS.forEach(function(path) {
        usedSamples = parseFilenames(path)
        //log("Testing samples in " + path + " files")
        checkFiles(usedSamples)
    })
    printResults(log)

}

exports.dirCheck = function() {
    if (shell.test('-d', shell.pwd() + "/../SONGS")) {
        shell.cd('../');
        //console.log('Change directory to Deluge root');
    }

    // check if folders assumed in app are here
    let missingDirs = []
    DELUGE_PATHS.concat(SAMPLES_PATH).forEach(function(path) {
        if (shell.test('-d', shell.pwd() + "/" + path) === false) {
            missingDirs.push(path)
        }
    })

    if (missingDirs.length != 0) {
        console.log(RED, "Beware: Some Deluge folders are missing: " + missingDirs.join(","))
        //shell.exit()
    }
    shell.mkdir('-p', '__ARCHIVED')
}

function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

function printResults(log) {
   // log("Missing samples")
    log("<pre>"+syntaxHighlight(JSON.stringify(missing, undefined, 4))+"</pre>")
    log("total " + total + ", missing " + missingCnt)
    //log(delugeXmls)
}



function findSample(path) {
    let result = null
    let parts = path.split("/")
    let searchFileName = parts[parts.length - 1]

     console.log("LOOK: " + searchFileName)
    if (existingUnique[searchFileName] && existingUnique[searchFileName] != "_DUPE_") {
        console.log("FOUND: Was memoized..", searchFileName)
        return existingUnique[searchFileName]
    }
    
    let matches = shell.find(SAMPLES_PATH).filter(function(file) {
        let isDir = shell.test('-d', file)
        if(isDir)return false;
        let fParts = file.split("/")
        let fileName = fParts[fParts.length - 1]
        if (existingUnique[fileName] == String(file)) {
            existingUnique[fileName] = "_DUPE_"
        } else {
            existingUnique[fileName] = String(file);
        }

        return fileName == searchFileName;
    });
    console.log(existingUnique)
    if (matches && matches.length == 1) {
        console.log("FOUND: unique filename")
        result = matches[0]
    }
    if (matches && matches[0]) {
        if (matches.length != 1) {
            // try to disambiguate via parent folder too
            matches = shell.find(SAMPLES_PATH).filter(function(file) {
                return file.match(parts[parts.length - 2] + '/' + parts[parts.length - 1]);
            });
            if(matches && matches.length == 1) {
                console.log("FOUND: not unique filename, but one has same parent folder as original")
                result = matches[0]
            }
        }
    }

    if(result == null) {
        console.log("NOT FOUND")
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
    let pwd = String(shell.pwd())

    for (let xmlFile in entries) {

        let paths = entries[xmlFile]
        paths.forEach(function(path) {
            total++
            path = pwd + "/" + path

            if (!shell.test('-f', path)) {
                missingCnt++
                console.time("findSample")
                let found = findSample(path)
                console.timeEnd("findSample")
                if (missing[xmlFile]) {
                    missing[xmlFile].push({
                        'invalid': path,
                        'found': found
                    })
                } else {
                    missing[xmlFile] = [{
                        'invalid': path,
                        'found': found
                    }]
                }

            
            } 

        })
        //console.log("checkFiles done")

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
                    //console.log(path)
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