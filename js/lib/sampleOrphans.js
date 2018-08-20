const fs = require('fs')
const walk = require('walk')
const path = require('path')
const mkdirp = require('mkdirp-sync')
const objIterator = require('object-recursive-iterator')
const unique = require('array-unique')
const { remote } = require('electron')


const helpers = require('./helpers')
const sampleResolver = require('./sampleResolver')


const DELUGE_XML_PATHS = ["SONGS", "KITS", "SYNTHS"]
const DELUGE_SAMPLES_PATH = "SAMPLES"
const DELUGE_FILENAME_PROP = 'fileName'

// tries to recognize DOS 8.3 short file names. not cross platfrom, must be skipped. 
const DOS_8_3_FORMAT = /~/ // /\w{0,7}~[0-9]{0,9}\./


let WORKING_DIR = remote.app.getAppPath()
let ARCHIVE_PATH = 'DelugeFixMissingSamplesArchive'
let ARCHIVE_FULL_PATH = ''
let total = 0
let totalFull = 0
let totalXmlFiles = 0
let existingSamples = {}
let uniqueSampleNames = {}
let missing = {}
let resultMapping = {} // maps 1 missing -> 1 found
let writeMapping = {} // xmlFile: {missing: [candidates], confirmed: candidate}
let missingReport = { notFound: [] }
let delugeXmls = {}
let skippedSamples = []
let log = null

exports.run = function run(l, onSuccess) {
    log = l
    log("Collecting all samples and analyzing Deluge XMLs, can take a while...")
    getAudioFileTree(() => {
        findMissing()
        onSuccess()
    })
    return true
}

// may set working dir
exports.isRootDir = function isRootDir(log) {
    let missingDirs = []

    // search upwards
    let cdUp = ""
    let maxDepth = 10
    for (let i = 0; i < maxDepth; i++) {
        if (i == 0) {
            cdUp = '/'
        } else if (i == 1) {
            cdUp = "/../"
        } else {
            cdUp = cdUp + "../"
        }

        let samplesDir = WORKING_DIR + cdUp + DELUGE_SAMPLES_PATH
        if (fs.existsSync(samplesDir)) {
            WORKING_DIR = path.normalize(WORKING_DIR + cdUp)
            i = maxDepth
        }
    }

    log("root@deluge:" + WORKING_DIR + "", 'info')

    DELUGE_XML_PATHS.concat(DELUGE_SAMPLES_PATH).forEach((p) => {
        if (!fs.existsSync(path.normalize(WORKING_DIR + "/" + p))) {
            missingDirs.push(p)
        }
    })
    if (missingDirs.length != 0) {
        log("Error. Some Deluge folders are missing (" + missingDirs.join(", ") + "), please place app in Deluge root directory.", 'error')
        return ''
    }

    ARCHIVE_FULL_PATH = path.normalize(WORKING_DIR + '/' + ARCHIVE_PATH)
    mkdirp(ARCHIVE_FULL_PATH)
    if (!fs.existsSync(ARCHIVE_FULL_PATH)) {
        log("Error. Could not create backup directory " + ARCHIVE_FULL_PATH, 'error')
        return ''
    }

    return WORKING_DIR
}

function findMissing() {
    DELUGE_XML_PATHS.forEach((p) => {
        delugeXmls[p] = parseFilenames(p)
    })

    if (totalXmlFiles == 0) {
        log("Exit. No XML Files found.", 'error')
        return false
    }
    getMissing()
    locateMissing()

    createBackupDir()
    // INTERACTIVE FIXING..
    printResults()

    getWriteMapping()
console.log("writeMapping")

console.log( missing  )

    fixInteractive()
    //fixMissing()

}

function fixInteractive() {
    log("....")
    log("Let's fix some samples.")
    log("Use KeyUp and KeyDown to navigate XML Files. Use KeyLeft and KeyRight to navigate samples. Type a number to confirm a replacement.", '')

    sampleResolver.run(WORKING_DIR, writeMapping)

}

function getWriteMapping() {
    writeMapping = {}
    for (let folder in delugeXmls) {
        let xmlFiles = Object.keys(delugeXmls[folder])
        xmlFiles.forEach((file) => {
            let testees = delugeXmls[folder][file].sampleNames
            testees.forEach((audioFile) => {
                if (resultMapping[audioFile]) {
                    let entry = {}
                    entry[audioFile] = resultMapping[audioFile]
                    if (writeMapping[file]) {
                        writeMapping[file].push(entry)
                        writeMapping[file] = unique(writeMapping[file])
                    } else {
                        writeMapping[file] = [entry]
                    }
                }
            })
        })
    }
}


function getMissing() {
    for (let folder in delugeXmls) {
        let xmlFiles = Object.keys(delugeXmls[folder])
        xmlFiles.forEach((file) => {
            let testees = delugeXmls[folder][file].sampleNames
            testees.forEach((audioFile) => {
                if (existingSamples[audioFile] === 1) {} else {
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
    return str ? str.replace(/\.wav$/i, '.wav') : str
}

function getFileNameFromPath(str) {
    let pp = str.split("/")
    return pp[pp.length - 1]
}

function getAudioFileTree(onEnd, onError) {
    let audioRegex = {
        wav: /\.WAV$/i
    }
    let options = {
        followLinks: false
    }
    let walker = walk.walk(path.normalize(WORKING_DIR + "/" + DELUGE_SAMPLES_PATH), options)

    walker.on("file", (basedir, fileStats, next) => {
        let f = fileStats.name
        if (f.match(audioRegex.wav) != null) {
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

    walker.on("errors", (root, nodeStatsArray, next) => {
        log("Error reading file!")
        log(nodeStatsArray)
        next()
    })

    walker.on("end", () => {
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
        xmlFiles.forEach((xmlFileName) => {
            if (missing[xmlFileName]) {
                let fixedJson = fixJson(delugeXmls[folder][xmlFileName].json, xmlFileName)
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
        xmlFiles.forEach((file) => {
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
    // one dir per sec
    let runDir = d.substring(0, d.length - 3).replace(/[\W_-]/g, '_')
    ARCHIVE_FULL_PATH = path.normalize(ARCHIVE_FULL_PATH + "/" + runDir)
    mkdirp(ARCHIVE_FULL_PATH)
    if (!fs.existsSync(ARCHIVE_FULL_PATH)) {
        log("Could not create backup directory " + ARCHIVE_FULL_PATH, 'error')
    }
}

function createBackup(f, fP) {
    fs.writeFileSync(path.normalize(ARCHIVE_FULL_PATH + "/" + f), fs.readFileSync(fP))
}

function createReport(data) {
    fs.writeFileSync(path.normalize(ARCHIVE_FULL_PATH + "/report.html"), data)
}


function fixJson(obj, xmlFileName) {
    let hasReplacements = false
    objIterator.forAll(obj, (path, key, obj) => {
        if (key == DELUGE_FILENAME_PROP) {
            let replacement = ''
            if (writeMapping[xmlFileName] && writeMapping[xmlFileName][obj[key]] && writeMapping[xmlFileName][obj[key]].confirmed) {
                replacement = writeMapping[xmlFileName][obj[key]].confirmed
            }
            if (replacement) {
                obj[key] = replacement
                hasReplacements = true
            }
        }
    })
    return hasReplacements ? obj : null
}

function locateMissing() {
    for (let xmlFile in missing) {
        let samplePaths = missing[xmlFile]
        samplePaths.forEach((p) => {
            let name = getFileNameFromPath(p)
            if (skippedSamples.includes(p)) {
                console.log("skip missing sample " + p)
                return true
            }
            let sampleNameMatches = uniqueSampleNames[name]

            if (!sampleNameMatches) {
                missingReport.notFound.push(p)
            } else {
                resultMapping[p] = helpers.sortAlphaNum(sampleNameMatches)
            }


        })
    }
    missingReport.notFound = unique(missingReport.notFound)
}


// deactivate: too greedy
// is match if: same path, same file extension, but file extension differs in lower/uppercase
function fixFileExtensionCase(testee) {
    let ext, sName = ''
    let parts = testee.split('.')
    if (parts && parts.length > 1) {
        ext = parts[parts.length - 1].toLowerCase()
        if (ext == 'wav') {
            sName = parts.slice(0, parts.length - 1) + '.'
            let variants = helpers.getAllCasePermutations(ext)
            variants.forEach((variant) => {
                console.log(sName)
                console.log(variant)
                let vpath = path.normalize(sName + variant)
                console.log("sName + variant", vpath, "uniqueSampleNames", uniqueSampleNames)
                if (uniqueSampleNames[vpath] && uniqueSampleNames[vpath].length == 1) {
                    console.log("---- FOUND")
                    resultMapping[testee] = uniqueSampleNames[vpath]
                }
            })
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

    filenames.forEach((filename) => {
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
    let notFoundCount = missingReport.notFound.length || 0
    let mappingCount = Object.keys(resultMapping).length || 0
    let msg = ''
    let stats = `
    ${totalFull} total scanned audio file(s) <br>
    ${totalXmlFiles} total XML file(s)<br>
    ${total} total sample assignment(s)
    `;

    if (skippedSamples.length) {
        log("Skipped " + skippedSamples.length + " sample(s). Full file path may not contain a '~' (Windows 8.3 short filenames)" + helpers.syntaxHighlight(unique(skippedSamples)), 'debug')
    }
    if (mappingCount == 0 && missingCnt == 0) {
        log("<br><br>Null sweat, out of your " + total + " sample paths all are chill.", 'success')
        log(stats, 'info')

    } else {
        log("....", 'info')
        log(stats, 'info')
        log(mappingCount + notFoundCount + " sample(s) missing in total.", 'error')

        //if (mappingCount) log(mappingCount + " sample(s) fixed", 'success')
        if (notFoundCount > 0) log((notFoundCount) + " sample(s) are lost (could not match sample name)", 'error')

        /*
                let relatedXmls = getRelatedXmlFiles()
                if (Object.keys(relatedXmls).length) {
                    log("....")
                    log("Have a look at the wiz biz, chummer.", 'info')
                    log("Report by XML File: " + helpers.syntaxHighlight(relatedXmls), 'info')
                    if (mappingCount) log("Fixed sample path(s): " + helpers.syntaxHighlight(resultMapping), 'success')
                    if (notFoundCount + ambigCount > 0) log("Missing report: " + helpers.syntaxHighlight(missingReport), 'info')
                }
            */
    }

    createReport($("#console").html())
}

function getRelatedXmlFiles() {
    let result = {}

    for (let folder in delugeXmls) {
        let xmlFiles = Object.keys(delugeXmls[folder])
        xmlFiles.forEach((file) => {
            let testees = delugeXmls[folder][file].sampleNames
            let intersectionNotFound = missingReport.notFound.filter(v1 => -1 !== testees.indexOf(v1))

            let intersectionFixed = resultMapping[file] ? resultMapping[file].filter(v3 => -1 !== testees.indexOf(v3)) : []
            let intersectionSkipped = skippedSamples.filter(v4 => -1 !== testees.indexOf(v4))

            let entry = {}
            if (intersectionFixed.length) entry.fixed = intersectionFixed
            if (intersectionNotFound.length) entry.notFound = intersectionNotFound

            if (intersectionSkipped.length) entry.skipped = intersectionSkipped

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