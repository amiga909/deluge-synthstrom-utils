const shell = require('shelljs')
const fs = require('fs')
const walk = require('fs-walk')
const path = require('path')

const x2jsLib = require('x2js')
const json2xml = require('json2xml')
const x2js = new x2jsLib()

const DELUGE_XML_PATHS = ["SONGS", "KITS", "SYNTHS"]
const DELUGE_SAMPLES_PATH = "SAMPLES"

let WORKING_DIR = process.cwd()

let delugeXmls = {}
let total = 0
let missing = {}
let missingCnt = 0
let existingSamples = {}
let usedSamples = {}
let $console = null
let existingUnique = {}


exports.run = function run(log) {
    if (!isRootDir()) {
        console.log("exit, not root dir")
        return false;
    }
    getAudioFileTree()
    console.log("existingSamples", existingSamples)
    DELUGE_XML_PATHS.forEach(function(path) {
        usedSamples[path] = parseFilenames(path)
        //log("Testing samples in " + path + " files")
        //checkFiles(usedSamples)

    })
    console.log("usedSamples", usedSamples)
    checkMissing()

    //printResults(log)

}

function checkMissing() {
    for (folder in usedSamples) {

        let xmlFiles = Object.keys(usedSamples.SONGS);//Object.keys(usedSamples[folder])

        console.log("folder", folder)
        console.log("xmlfiles", xmlFiles)
        

        xmlFiles.forEach(function(file) {
            console.log("file", file)
                file.forEach(function(audioFile){
                    if (existingSamples[audioFile] == 1) {
                        console.log(audioFile + " exists")
                    } else {
                        console.log(audioFile + " not exists")
                    }
                })
        })

}

}



function getAudioFileTree() {
    let audioRegex = {
        wav: /\.WAV$/i,
        aif: /\.AIF$/i,
        aiff: /\.AIFF$/i,
    }
    walk.walkSync(path.normalize(WORKING_DIR + "/" + DELUGE_SAMPLES_PATH), function(basedir, filename, stat) {
        //let perm = stat.isDirectory() ? 0755 : 0644;

        if (filename.match(audioRegex.wav) != null ||
            filename.match(audioRegex.aif) != null ||
            filename.match(audioRegex.aiff) != null) {
            let p = path.join(basedir, filename).replace(/.*\/SAMPLES\//, '')
            existingSamples[p] = 1
        }
    });
    //console.log(existingSamples)
}

function isRootDir() {

    let missingDirs = []
    // assume Deluge root is parent
    let oneUp = WORKING_DIR + "/../" + DELUGE_SAMPLES_PATH
    if (fs.existsSync(oneUp)) {
        WORKING_DIR += "/../"
    }

    DELUGE_XML_PATHS.concat(DELUGE_SAMPLES_PATH).forEach(function(path) {
        if (!fs.existsSync(WORKING_DIR + path)) {
            missingDirs.push(path)
        }
    })
    if (missingDirs.length != 0) {

        console.log("Beware: Some Deluge folders are missing: " + missingDirs.join(","))
        //shell.exit()
        return false
    }
    return true
}

exports.dirCheck = function() {
    return isRootDir()

    // check if folders assumed in app are here



    shell.mkdir('-p', '__ARCHIVED')
}

function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
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
    console.log("<pre>" + syntaxHighlight(JSON.stringify(missing, undefined, 4)) + "</pre>")
    console.log("total " + total + ", missing " + missingCnt)
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

    let matches = shell.find(DELUGE_SAMPLES_PATH).filter(function(file) {
        let isDir = shell.test('-d', file)
        if (isDir) return false;
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
            if (matches && matches.length == 1) {
                console.log("FOUND: not unique filename, but one has same parent folder as original")
                result = matches[0]
            }
        }
    }

    if (result == null) {
        console.log("NOT FOUND")
    }


    //console.log("result: path "+trimSamplesPath(path)+" goes to " + result)
    return result
}

function trimSamplesPath(path) {
    result = path.replace(shell.pwd(), "")
    let parts = path.split("/")
    parts.reverse().forEach(function(part, index) {
        if (part == DELUGE_SAMPLES_PATH) {
            result = parts.slice(0, index).reverse()
        }
    })
    return SAMPLES_PATH + "/" + result.join("/")
}

function parseFilenames(dirName) {
    let samples = {}

    readXMLDirectory(path.normalize(WORKING_DIR + "/" + dirName + "/"),
        //onSuccess
        function(fileName, obj) {

            if (delugeXmls[dirName]) {
                delugeXmls[fileName].push(obj)
            } else {
                delugeXmls[fileName] = [obj]
            }

            extractFileNames(obj, samples, fileName)
        },
        //onError
        function(error) {
            console.log("error opening file: " + error)
        })

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



function readXMLDirectory(dirname, onFileContent, onError) {
    fs.readdir(dirname, function(err, filenames) {
        if (err) {
            //console.log(err)
            onError(err);
            return;
        }
        filenames.forEach(function(filename) {
            //console.log(dirname + "+" + filename)
            if (filename.match(/\.XML$/) == null) {
                return;
            }
            fs.readFile(path.normalize(dirname + "/" + filename), 'utf-8',
                function(err, content) {
                    if (err) {
                        onError(err);
                        return;
                    }
                    onFileContent(filename, toJson(content));
                });
        });
    });
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