const fs = require('fs')
const walk = require('walk')
const path = require('path')
const x2jsLib = require('x2js')
const json2xml = require('json2xml')
const objIterator = require('object-recursive-iterator');
const x2js = new x2jsLib()
const { remote } = require('electron')
const mkdirp = require('mkdirp-sync');

const helpers = require('./helpers')
const DELUGE_XML_PATHS = ["SONGS", "KITS", "SYNTHS"]
const DELUGE_SAMPLES_PATH = "SAMPLES"
const DELUGE_FILENAME_PROP = 'fileName'


let WORKING_DIR = remote.app.getAppPath() //process.cwd()
let ARCHIVE_PATH = '__MISSING_SAMPLES_FIXER_ARCHIVE'
let ARCHIVE_FULL_PATH = ''
let total = 0
let totalFull = 0
let totalXmlFiles = 0
let existingSamples = {}
let uniqueSampleNames = {}
let missing = {}
let missingReport = { totalMissing: 0, notFound: [], ambiguous: {} }
let delugeXmls = {}
let $console = null
let log = null;


exports.run = function run(l, onSuccess) {
    log = l

    log('Working directory: ' + remote.app.getAppPath(), 'debug')
    log("process cwd: " + process.cwd(), 'debug')
    if (!isRootDir(log)) {
        log("Exit. WORKING_DIR: " + WORKING_DIR, 'error')
        return false;
    }
    getAudioFileTree(function() {
        findMissing()
        onSuccess()
    })

}

// may set working dir
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
        log("Some Deluge folders are missing (" + missingDirs.join(", ") + "), place app in Deluge root directory.", 'error')
        return false
    }

    ARCHIVE_FULL_PATH = path.normalize(WORKING_DIR + '/' + ARCHIVE_PATH)
    mkdirp(ARCHIVE_FULL_PATH);
    if (!fs.existsSync(ARCHIVE_FULL_PATH)) {
        log("Could not create backup directory " + ARCHIVE_FULL_PATH, 'error')
        return false
    }

    return true
}

function findMissing(onSuccess) {
    DELUGE_XML_PATHS.forEach(function(p) {
        delugeXmls[p] = parseFilenames(p)
    })

    if (totalXmlFiles == 0) {
        log("Exit. No XML Files found.", 'error')
        return false;
    }
    getMissing()
    let map = locateMissing()
    fixMissing(map)
    printResults()

    return missing;
}

function getMissing() {
    for (let folder in delugeXmls) {
        let xmlFiles = Object.keys(delugeXmls[folder]);
        xmlFiles.forEach(function(file) {
            let testees = delugeXmls[folder][file].sampleNames
            testees.forEach(function(audioFile) {
                let norm = normalizeFileExtension(audioFile)
                if (existingSamples[norm] == 1) {
                    // console.log(norm + " exists")
                    // console.log(existingSamples[norm])
                } else {
                    // console.log(existingSamples[norm], norm)

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

function normalizeFileExtension(str) {
    return str ? str.replace(/\.wav$/i, '.wav').replace(/\.aif$/i, '.aif').replace(/\.aiff$/i, '.aiff') : str;
}

function getFileNameFromPath(str) {
    let pp = str.split("/")
    return pp[pp.length - 1]
}

function getAudioFileTree(onEnd, onError) {
    log("Collecting stored samples...")
    let audioRegex = {
        wav: /\.WAV$/i,
        aif: /\.AIF$/i,
        aiff: /\.AIFF$/i,
    }
    let options = {
        followLinks: false
    }
    let walker = walk.walk(path.normalize(WORKING_DIR + "/" + DELUGE_SAMPLES_PATH), options);

    walker.on("file", function(basedir, fileStats, next) {
        //console.log(fileStats.name)
        let f = fileStats.name
        if (f.match(audioRegex.wav) != null ||
            f.match(audioRegex.aif) != null ||
            f.match(audioRegex.aiff) != null) {
            let p = normalizePath(path.join(basedir, f).replace(/.*\/SAMPLES\//, 'SAMPLES/'))

            p = normalizeFileExtension(p)
            existingSamples[p] = 1
            let sampleName = getFileNameFromPath(p)
            if (uniqueSampleNames[sampleName]) {
                uniqueSampleNames[sampleName].push(p)
            } else {
                uniqueSampleNames[sampleName] = [p]
            }
            // if (p.match(/808 Rim/) != null) {console.log("pp ", p)}
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


function printResults() {
    let missingCnt = missingReport.totalMissing
    if (missingCnt == 0) {
        log("<br><br>Null sweat chummer, all your sample paths are chill.", 'success')
    } else {
        log("<br><br>Drek chummer, some samples are fragged. We got missing samples.", 'error')
        log(helpers.syntaxHighlight(missing))

        let ambigCount = Object.keys(missingReport.ambiguous).length
        let notFoundCount = missingReport.notFound.length
        if (notFoundCount > 0 || ambigCount > 0) {
            if (notFoundCount > 0) {
                log("Not found samples:" + helpers.syntaxHighlight(missingReport.notFound))
            }
            if (notFoundCount > 0) {
                log("Ambiguous samples:" + helpers.syntaxHighlight(missingReport.ambiguous))
            }
            log("Of " + missingCnt + " missing samples, " + (notFoundCount + ambigCount) + " are not fixed.")
        } else {
            log("Null sweat chummer I got your hoop, all your sample paths are chill now. No more missing samples.", 'green')
        }

        log("Total amount of sample assignments in " + DELUGE_XML_PATHS.join(', ') + " XML Files: " + total)

    }

}

function fixMissing(map) {
    let xmlsToWrite = {}

    for (let folder in delugeXmls) {
        let xmlFiles = Object.keys(delugeXmls[folder]);
        xmlFiles.forEach(function(xmlFileName) {
            if (missing[xmlFileName]) {
                let fixedJson = fixJson(delugeXmls[folder][xmlFileName].json, map)
                if (fixedJson != null) {
                    let xml = toXml(fixedJson)
                    writeXmlFile(xmlFileName, xml)
                }
            }
        })
    }
}

function writeXmlFile(xmlFile, fixedXml) {
    for (let folder in delugeXmls) {
        let xmlFiles = Object.keys(delugeXmls[folder]);
        xmlFiles.forEach(function(file) {
            if (file == xmlFile) {
                let fullPath = delugeXmls[folder][file].fullPath
                if (fs.existsSync(fullPath)) {
                    createBackup(file, fullPath)
                    fs.writeFileSync(fullPath, fixedXml, 'utf8')
                } else {
                    //console.log("Error could not write to file ", xmlFile)
                }
            }

        })
    }
}

function createBackup(f, fP) {
    let d = new Date(Date.now()).toLocaleString()
    // one dir per minute
    let runDir = d.substring(0, d.length - 6).replace(/[\W_-]/g, '_');

    let p = path.normalize(ARCHIVE_FULL_PATH + "/" + runDir)
    mkdirp(p);
    if (!fs.existsSync(p)) {
        log("Could not create backup directory " + p, 'error')
    }
    fs.writeFileSync(path.normalize(p + "/" + f), fs.readFileSync(fP))

}


function fixJson(obj, map) {

    hasReplacements = false
    objIterator.forAll(obj, function(path, key, obj) {
        if (key == DELUGE_FILENAME_PROP) {
            if (map[obj[key]]) {
                obj[key] = map[obj[key]]
                hasReplacements = true
            }
        }
    })
    return hasReplacements ? obj : null;
}




function locateMissing() {
    //log("<br/>Locate missing..")
    let resultMapping = {} // missing -> found
    for (let xmlFile in missing) {
        let samplePaths = missing[xmlFile]
        samplePaths.forEach(function(p) {
            let name = getFileNameFromPath(p)
            missingReport.totalMissing++
                if (uniqueSampleNames[name] && uniqueSampleNames[name].length == 1) {
                    resultMapping[p] = uniqueSampleNames[name]
                    //console.log("f unique replacement")
                } else {
                    if (uniqueSampleNames[name]) {
                        missingReport.ambiguous[p] = uniqueSampleNames[name]
                    } else {
                        missingReport.notFound.push(p)
                    }
                }

        })
    }

    return resultMapping;
}


function parseFilenames(dirName) {
    let parsed = {}
    let sampleNames = []

    let p = path.normalize(WORKING_DIR + "/" + dirName + "/")
    parsed = readXMLDirectory(p)

    return parsed;
}


function extractFileNames(obj, stack, fileName) {
    for (let property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (typeof obj[property] == "object") {
                extractFileNames(obj[property], stack, fileName);
            } else {
                if (property == DELUGE_FILENAME_PROP) {
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
    p = p.replace(/^SAMPLES\//, 'SAMPLES/')
    p = p.replace(/^\/SAMPLES\//, 'SAMPLES/')
    return p
}

function readXMLDirectory(dirname) {
    let files = {}
    let sampleNames = []
    let filenames = fs.readdirSync(dirname)

    filenames.forEach(function(filename) {
        if (filename.match(/\.XML$/i) == null) {
            return
        }
        let fP = path.normalize(dirname + "/" + filename)
        let buf = fs.readFileSync(fP, 'utf8')
        let json = toJson(buf)
        extractFileNames(json, sampleNames, filename)
        total += sampleNames.length
        totalXmlFiles++
        files[filename] = { 'json': json, 'xml': buf, 'fullPath': fP, 'sampleNames': sampleNames.filter(onlyUnique) };
    })

    return files
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function toJson(xml) {
    // cannot parse xml version statement :p
    xml = xml.replace(/<\?xml .*\?>/, '');
    // one root tag allowed, use wrapper
    let json = x2js.xml2js('<wrap>' + xml + '</wrap>').wrap;

    return json;
}


function toXml(j) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + x2js.js2xml(j, "\t");
}