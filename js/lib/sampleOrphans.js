const shell = require('shelljs')
const fs = require('fs')
const walk = require('walk')
const path = require('path')


const x2jsLib = require('x2js')
const json2xml = require('json2xml')
const x2js = new x2jsLib()

const DELUGE_XML_PATHS = ["SONGS", "KITS", "SYNTHS"]
const DELUGE_SAMPLES_PATH = "SAMPLES"

const { remote } = window.require('electron')

let WORKING_DIR = process.cwd()

let total = 0
let totalFull = 0
let missing = {}
let missingCnt = 0
let existingSamples = {}

let usedSamples = {}
let $console = null


exports.run = function run(log, onSuccess) {


    if (!isRootDir(log)) {
        log("Exit. Deluge root directory not found. WORKING_DIR: " + WORKING_DIR)
        return false;
    }
    getAudioFileTree(log, function() {
        findMissing()
        onSuccess()
    })


}

exports.dirCheck = function(log) {
    // add chooseable workdir later..
    log('Working directory: ' + remote.app.getAppPath())
    return isRootDir(log)
    shell.mkdir('-p', '__ARCHIVED')
}

function isRootDir(log) {

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

        log("Beware: Some Deluge folders are missing: " + missingDirs.join(","))
        //shell.exit()
        return false
    }
    return true
}

function findMissing(onSuccess) {
    DELUGE_XML_PATHS.forEach(function(p) {
        usedSamples[p] = parseFilenames(p)

    })
    //console.log(" deluge analysis ", usedSamples, usedSamples.SONGS)


    checkMissing()

    printResults(log)


    return missing;
}

function checkMissing() {
    for (folder in usedSamples) {
        let xmlFiles = Object.keys(usedSamples[folder]);
        xmlFiles.forEach(function(file) {
            let testees = usedSamples[folder][file].sampleNames
            testees.forEach(function(audioFile) {
                if (existingSamples[audioFile] == 1) {
                    //console.log(audioFile + " exists")
                } else {
                    missingCnt++
                    if (missing[file]) {
                        missing[file].push(audioFile)
                    } else {
                        missing[file] = [audioFile]
                    }
                }
            })
        })
    }
}



function getAudioFileTree(log, onEnd, onError) {
    log("Collecting stored samples...")
    let audioRegex = {
        wav: /\.WAV$/i,
        aif: /\.AIF$/i,
        aiff: /\.AIFF$/i,
    }
    let options = {
        followLinks: false
        // directories with these keys will be skipped
        // , filters: ["Temp", "_Temp"]
    };
    let walker = walk.walk(path.normalize(WORKING_DIR + "/" + DELUGE_SAMPLES_PATH), options);

    walker.on("file", function(basedir, fileStats, next) {
        //console.log(fileStats.name)
        let f = fileStats.name
        if (f.match(audioRegex.wav) != null ||
            f.match(audioRegex.aif) != null ||
            f.match(audioRegex.aiff) != null) {
            let p = normalizePath(path.join(basedir, f).replace(/.*\/SAMPLES\//, ''))
            existingSamples[p] = 1
            totalFull++
        }
        next()
    });

    walker.on("errors", function(root, nodeStatsArray, next) {
        log("Error reading file!")
        log(nodeStatsArray)
        next()
    });

    walker.on("end", function() {
        log("Done. Found " + totalFull + " audio files.");
        onEnd()
    });
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
    log("<br><br>Drek chummer, some samples are fragged.")
    log("<pre>" + syntaxHighlight(JSON.stringify(missing, undefined, 4)) + "</pre>")
    log("total samples used " + total + ", missing " + missingCnt)
    log("<br><br>Null sweat chummer, let's fix the sample paths in your XML files.")
}


function parseFilenames(dirName) {
    let parsed = {}
    let sampleNames = []

    let p = path.normalize(WORKING_DIR + "/" + dirName + "/")
    parsed = readXMLDirectory(p)

    //console.log("delugaaa ", parsed, "dirname " + dirName)
    return parsed;
}


function extractFileNames(obj, stack, fileName) {
    for (var property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (typeof obj[property] == "object") {
                extractFileNames(obj[property], stack, fileName);
            } else {
                if (property == 'fileName') {
                    if (!stack) {
                        stack = []
                    }
                    let p = String(obj[property])
                    if (p) {
                        stack.push(normalizePath(p))
                    }
                }
            }
        }
    }
}

function normalizePath(p) {
    p = path.normalize(p)
    p = p.replace(/^SAMPLES\//, '')
    p = p.replace(/^\/SAMPLES\//, '')
    return p
}

function readXMLDirectory(dirname) {
    let files = {}
    let sampleNames = []

    let filenames = fs.readdirSync(dirname)

    //console.log("x", filenames)
    filenames.forEach(function(filename) {
        //console.log(dirname + "+" + filename)
        if (filename.match(/\.XML$/i) == null) {
            return;
        }
        let buf = fs.readFileSync(path.normalize(dirname + "/" + filename), 'utf8')

        let json = toJson(buf)

        extractFileNames(json, sampleNames, filename)
        total += sampleNames.length
        files[filename] = { 'json': json, 'xml': buf, 'sampleNames': sampleNames };
    });

    return files;
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