const fs = require('fs')
const walk = require('walk')
const path = require('path')
const mkdirp = require('mkdirp-sync')
const objIterator = require('object-recursive-iterator')
const unique = require('array-unique')
const { remote } = require('electron')

const helpers = require('./helpers')
const DELUGE_XML_PATHS = ["SONGS", "KITS", "SYNTHS"]
const DELUGE_SAMPLES_PATH = "SAMPLES"
const DELUGE_FILENAME_PROP = 'fileName'

// tries to recognize DOS 8.3 short file names. not cross platfrom, must be skipped. 
const DOS_8_3_FORMAT = /~/ // /\w{0,7}~[0-9]{0,9}\./


let WORKING_DIR = remote.app.getAppPath()
let ARCHIVE_PATH = '__MISSING_SAMPLES_FIXER_ARCHIVE'
let ARCHIVE_FULL_PATH = ''
let total = 0
let totalFull = 0
let totalXmlFiles = 0
let existingSamples = {}
let uniqueSampleNames = {}
let missing = {}
let resultMapping = {} // maps 1 missing -> 1 found
let missingReport = { notFound: [], ambiguous: {} }
let delugeXmls = {}
let skippedSamples = []
let $console = null
let log = null

exports.run = function run(l, onSuccess) {
    log = l
    if (!isRootDir(log)) {
        log("Exit.", 'error')
        return false
    }
    log("Collecting all samples and analyzing Deluge XMLs, can take a while...")
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
        WORKING_DIR = path.normalize(WORKING_DIR + "/../")
        log("Changed Working Dir to " + WORKING_DIR, 'debug')
    }

    // electron standalone app
    let threeUp = WORKING_DIR + "/../../../../" + DELUGE_SAMPLES_PATH
    if (fs.existsSync(threeUp)) {
        WORKING_DIR = path.normalize(WORKING_DIR + "/../../../../")
        log("Changed Working Dir to " + WORKING_DIR, 'debug')
    }
    let fourUp = WORKING_DIR + "/../../../../../" + DELUGE_SAMPLES_PATH
    if (fs.existsSync(fourUp)) {
        WORKING_DIR = path.normalize(WORKING_DIR + "/../../../../../")
        log("Changed Working Dir to " + WORKING_DIR, 'debug')
    }

    DELUGE_XML_PATHS.concat(DELUGE_SAMPLES_PATH).forEach(function(p) {
        if (!fs.existsSync(path.normalize(WORKING_DIR + "/" + p))) {
            missingDirs.push(p)
        }
    })
    if (missingDirs.length != 0) {
        log("Some Deluge folders are missing (" + missingDirs.join(", ") + "), place app in Deluge root directory.", 'error')
        return false
    }

    ARCHIVE_FULL_PATH = path.normalize(WORKING_DIR + '/' + ARCHIVE_PATH)
    mkdirp(ARCHIVE_FULL_PATH)
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
        return false
    }
    getMissing()
    locateMissing()
    createBackupDir()
    fixMissing()
    printResults()
}

function getMissing() {
    for (let folder in delugeXmls) {
        let xmlFiles = Object.keys(delugeXmls[folder])
        xmlFiles.forEach(function(file) {
            let testees = delugeXmls[folder][file].sampleNames
            testees.forEach(function(audioFile) {
                let norm = audioFile
                if (existingSamples[norm] == 1) {
                    //console.log(norm + " exists")
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
    return str ? str.replace(/\.wav$/i, '.wav').replace(/\.aif$/i, '.aif').replace(/\.aiff$/i, '.aiff') : str
}

function getFileNameFromPath(str) {
    let pp = str.split("/")
    return pp[pp.length - 1]
}

function getAudioFileTree(onEnd, onError) {
    let audioRegex = {
        wav: /\.WAV$/i,
        aif: /\.AIF$/i,
        aiff: /\.AIFF$/i,
    }
    let options = {
        followLinks: false
    }
    let walker = walk.walk(path.normalize(WORKING_DIR + "/" + DELUGE_SAMPLES_PATH), options)

    walker.on("file", function(basedir, fileStats, next) {
        let f = fileStats.name
        if (f.match(audioRegex.wav) != null ||
            f.match(audioRegex.aif) != null ||
            f.match(audioRegex.aiff) != null) {
            let p = normalizePath(path.join(basedir, f).replace(/.*\/SAMPLES\//, 'SAMPLES/'))

            existingSamples[p] = 1
            let sampleName = getFileNameFromPath(p)

            if (uniqueSampleNames[sampleName]) {
                uniqueSampleNames[sampleName].push(p)
            } else {
                uniqueSampleNames[sampleName] = [p]
            }

            totalFull++
        }
        next()
    })

    walker.on("errors", function(root, nodeStatsArray, next) {
        log("Error reading file!")
        log(nodeStatsArray)
        next()
    })

    walker.on("end", function() {
        if (totalFull == 0) {
            log("Frag! No audio files found.", 'error')
        } else {
            onEnd()
        }

    })
}

function fixMissing() {
    let xmlsToWrite = {}
    for (let folder in delugeXmls) {
        let xmlFiles = Object.keys(delugeXmls[folder])
        xmlFiles.forEach(function(xmlFileName) {
            if (missing[xmlFileName]) {
                let fixedJson = fixJson(delugeXmls[folder][xmlFileName].json)
                if (fixedJson != null) {
                    let xml = helpers.toXml(fixedJson)
                    writeXmlFile(xmlFileName, xml)
                }
            }
        })
    }
}

function writeXmlFile(xmlFile, fixedXml) {
    for (let folder in delugeXmls) {
        let xmlFiles = Object.keys(delugeXmls[folder])
        xmlFiles.forEach(function(file) {
            if (file == xmlFile) {
                let fullPath = delugeXmls[folder][file].fullPath
                if (fs.existsSync(fullPath)) {
                    createBackup(file, fullPath)
                    fs.writeFileSync(fullPath, fixedXml, 'utf8')
                    log("Overwrite " + getFileNameFromPath(fullPath), 'debug')
                } else {
                    //console.log("Error could not write to file ", xmlFile)
                }
            }

        })
    }
}


function createBackupDir() {
    let d = new Date(Date.now()).toLocaleString()
    // one dir per minute
    let runDir = d.substring(0, d.length - 6).replace(/[\W_-]/g, '_')

    ARCHIVE_FULL_PATH = path.normalize(ARCHIVE_FULL_PATH + "/" + runDir)
    mkdirp(ARCHIVE_FULL_PATH)
    if (!fs.existsSync(ARCHIVE_FULL_PATH)) {
        log("Could not create backup directory " + ARCHIVE_FULL_PATH, 'error')
    }

}

function createBackup(f, fP) {
    fs.writeFileSync(path.normalize(ARCHIVE_FULL_PATH + "/" + f), fs.readFileSync(fP))
}


function fixJson(obj) {
    hasReplacements = false
    objIterator.forAll(obj, function(path, key, obj) {
        if (key == DELUGE_FILENAME_PROP) {
            if (resultMapping[obj[key]]) {
                obj[key] = resultMapping[obj[key]]
                hasReplacements = true
            }
        }
    })
    return hasReplacements ? obj : null
}

function locateMissing() {
    for (let xmlFile in missing) {
        let samplePaths = missing[xmlFile]
        samplePaths.forEach(function(p) {
            let name = getFileNameFromPath(p)
            if (skippedSamples.includes(p)) { return true }
            if (uniqueSampleNames[name] && uniqueSampleNames[name].length == 1) {
                resultMapping[p] = uniqueSampleNames[name]
               // log("locateMissing: Move " + p + " to " + uniqueSampleNames[name], 'debug')
                //console.log("f unique replacement")
            } else {
                let normName = normalizeFileExtension(name)
                if (uniqueSampleNames[normName] && uniqueSampleNames[normName].length == 1) {
                    resultMapping[p] = uniqueSampleNames[normName]
                    //log("locateMissing: File extension corrected Move " + p + " to " + uniqueSampleNames[name], 'debug')
                    //console.log("f unique replacement")
                }
                if (uniqueSampleNames[name]) {
                    missingReport.ambiguous[p] = uniqueSampleNames[name]
                } else {
                    missingReport.notFound.push(p)
                }

            }
        })
    }
    missingReport.notFound = unique(missingReport.notFound)
    disambiguateSamples()
}

function disambiguateSamples() {
    //console.log(missingReport.ambiguous)
    for (let p in missingReport.ambiguous) {
        // if there is sample that has the same parent folder and the others do not, take this
        //console.log(p)
        let parentFolder = getParentFolder(p)
        let pleaseJustOne = missingReport.ambiguous[p].filter(function(c) {
            return getParentFolder(c) == parentFolder
        })
        //console.log(pleaseJustOne)
        if (pleaseJustOne && pleaseJustOne.length == 1) {
            //console.log("aiks deduped", p)
            delete missingReport.ambiguous[p]
            uniqueSampleNames[p] = pleaseJustOne[0]
            missingReport.notFound[p] = [pleaseJustOne[0]]
            //log("Move " + p + " to " + map[p], 'debug')
        }
    }
}


function getParentFolder(fP) {
    let parts = fP.split('/')
    let parent = parts[parts.length - 2]
    return parent
}

function parseFilenames(dirName) {
    let parsed = {}
    let sampleNames = []

    let p = path.normalize(WORKING_DIR + "/" + dirName + "/")
    parsed = readXMLDirectory(p)

    return parsed
}


function extractFileNames(obj, stack, fileName) {
    for (let property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (typeof obj[property] == "object") {
                extractFileNames(obj[property], stack, fileName)
            } else {
                if (property == DELUGE_FILENAME_PROP) {
                    if (!stack) {
                        stack = []
                    }
                    let p = String(obj[property])
                    if (p) {
                        stack.push(normalizePath(p))
                        if (p.match(DOS_8_3_FORMAT) != null) {
                            skippedSamples.push(p)
                        }
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
    //let sampleNames = []
    let filenames = fs.readdirSync(dirname)

    filenames.forEach(function(filename) {
        if (filename.match(/\.XML$/i) == null) {
            return
        }
        let sampleNames = []
        let fP = path.normalize(dirname + "/" + filename)
        let buf = fs.readFileSync(fP, 'utf8')
        let json = helpers.toJson(buf)
        extractFileNames(json, sampleNames, filename)
        total += sampleNames.length
        totalXmlFiles++
        files[filename] = { 'json': json, 'xml': buf, 'fullPath': fP, 'sampleNames': sampleNames.filter(onlyUnique) }
    })

    return files
}

function printResults() {
    let ambigCount = Object.keys(missingReport.ambiguous).length || 0
    let notFoundCount = missingReport.notFound.length || 0
    let mappingCount = Object.keys(resultMapping).length || 0
    let missingCnt = ambigCount + notFoundCount

    if (skippedSamples.length) {
        log("Skipped " + skippedSamples.length + " sample(s). Full file path may not contain a '~' (Windows 8.3 short filenames)" + helpers.syntaxHighlight(unique(skippedSamples)), 'debug')
    }
    if (mappingCount == 0 && missingCnt == 0) {
        log("<br><br>Null sweat, out of your " + total + " sample paths all are chill.", 'success')
    } else {
        log("Nice run, chummer.", 'info')
        log(totalFull + " total scanned audio files", 'info')
        log(totalXmlFiles + " total XML files", 'info')
        log(total + " total sample assignments", 'info')

        if (mappingCount) log(mappingCount + " sample(s) fixed", 'success')
        if (notFoundCount + ambigCount > 0) log((notFoundCount + ambigCount) + " sample(s) not fixed", 'error')

        let relatedXmls = getRelatedXmlFiles()
        if (Object.keys(relatedXmls).length) {
            log(" ")
            log("Have a look at the wiz biz, chummer.", 'info')
            log("Report by XML File: " + helpers.syntaxHighlight(relatedXmls), 'info')
            if (mappingCount) log("Fixed sample path(s): " + helpers.syntaxHighlight(resultMapping), 'success')
            if (notFoundCount + ambigCount > 0) log("Missing report: " + helpers.syntaxHighlight(missingReport), 'info')
        }
    }
}

function getRelatedXmlFiles() {
    let result = {}
    let allAmbiguous = []
    for (let p in missingReport.ambiguous) {
        allAmbiguous.push(p)
    }
    for (let folder in delugeXmls) {
        let xmlFiles = Object.keys(delugeXmls[folder])
        xmlFiles.forEach((file) => {
            let testees = delugeXmls[folder][file].sampleNames
            let intersectionNotFound = missingReport.notFound.filter(v1 => -1 !== testees.indexOf(v1))
            let intersectionAmbiguous = allAmbiguous.filter(v2 => -1 !== testees.indexOf(v2))
            let intersectionFixed = resultMapping[file] ? resultMapping[file].filter(v3 => -1 !== testees.indexOf(v3)) : []
            let intersectionSkipped = skippedSamples.filter(v4 => -1 !== testees.indexOf(v4))
            //console.log(intersectionFixed, intersectionSkipped, intersectionAmbiguous, intersectionNotFound)
            let entry = {}
            if (intersectionFixed.length) entry.fixed = intersectionFixed
            if (intersectionNotFound.length) entry.notFound = intersectionNotFound
            if (intersectionAmbiguous.length) entry.ambiguous = intersectionAmbiguous
            if (intersectionSkipped.length) entry.skipped = intersectionSkipped
            console.log(entry)
            if (Object.keys(entry).length) {
                result[file] = entry
            }
        })
    }

    return result
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index
}