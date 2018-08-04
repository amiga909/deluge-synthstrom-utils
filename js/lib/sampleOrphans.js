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

let WORKING_DIR = remote.app.getAppPath() //process.cwd()
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
        return false
    }
    getMissing()
    locateMissing()
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
    })

    walker.on("errors", function(root, nodeStatsArray, next) {
        log("Error reading file!")
        log(nodeStatsArray)
        next()
    })

    walker.on("end", function() {
        if (totalFull == 0) {
            log("Looks bad, no audio files found.", 'error')
        } else {
            log("Done. Found " + totalFull + " audio files.")
            onEnd()
        }

    });
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

function createBackup(f, fP) {
    let d = new Date(Date.now()).toLocaleString()
    // one dir per minute
    let runDir = d.substring(0, d.length - 6).replace(/[\W_-]/g, '_')

    let p = path.normalize(ARCHIVE_FULL_PATH + "/" + runDir)
    mkdirp(p)
    if (!fs.existsSync(p)) {
        log("Could not create backup directory " + p, 'error')
    }
    fs.writeFileSync(path.normalize(p + "/" + f), fs.readFileSync(fP))

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
            let name = normalizeFileExtension(getFileNameFromPath(p))
            if (uniqueSampleNames[name] && uniqueSampleNames[name].length == 1) {
                resultMapping[p] = uniqueSampleNames[name]
                //log("Move " + p + " to " + uniqueSampleNames[name], 'debug')
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
                    // Deluge bug, found some in older Songs, these files don't exist on the disk but Deluge manages to trace them somehow..
                    if (p && p.match(/_~1\.WAV$/i) == null) {
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
    //console.log(resultMapping)
    //console.log("res")
    log("Total amount of sample assignments in " + DELUGE_XML_PATHS.join(', ') + " XML Files: " + total, 'info')
    if (mappingCount == 0 && missingCnt == 0) {
        log("<br><br>Let's have a drink, all your sample paths are valid.", 'success')
    } else {
        log("<br><br> Fixed sample paths" + helpers.syntaxHighlight(resultMapping), 'debug')

        if (notFoundCount > 0) {
            let displ = missingReport.notFound.sort()
            log(displ.length + " samples are missing" + helpers.syntaxHighlight(displ), 'error')
        }
        if (ambigCount > 0) {
            log("Ambiguous samples, please resolve manually: " + helpers.syntaxHighlight(missingReport.ambiguous), 'error')
        }


        let relatedXmls = getRelatedXmlFiles()
        if (Object.keys(relatedXmls).length) {
            log("These XML Files contain invalid sample paths " + helpers.syntaxHighlight(relatedXmls), 'error')
        }
        log("Fixed " + mappingCount + " invalid sample paths", 'success')

        if (notFoundCount + ambigCount > 0) {
            log((notFoundCount + ambigCount) + " are not fixed", 'error')
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
        xmlFiles.forEach(function(file) {
            let testees = delugeXmls[folder][file].sampleNames
            let intersectionNotFound = missingReport.notFound.filter(v1 => -1 !== testees.indexOf(v1))
            let intersectionAmbiguous = allAmbiguous.filter(v2 => -1 !== testees.indexOf(v2))
            let res = intersectionAmbiguous.concat(intersectionNotFound)
           
            if (res.length) {
                result[file] = res;
            }
        })
    }

    return result
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index
}