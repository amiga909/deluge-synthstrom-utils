const fs = require('fs')
const walk = require('walk')
const path = require('path')
const x2jsLib = require('x2js')
const json2xml = require('json2xml')
const objIterator = require('object-recursive-iterator');
const x2js = new x2jsLib()
const { remote } = require('electron')
const helpers = require('./helpers')

const DELUGE_XML_PATHS = ["SONGS", "KITS", "SYNTHS"]
const DELUGE_SAMPLES_PATH = "SAMPLES"
const DELUGE_FILENAME_PROP = 'fileName'


let WORKING_DIR = remote.app.getAppPath() //process.cwd()

let total = 0
let totalFull = 0
let missing = {}
let existingSamples = {}
let uniqueSampleNames = {}
let missingReport = {
    notFound: [],
    ambiguous: {}
}

let delugeXmls = {}
let $console = null
let log = null;


exports.run = function run(l, onSuccess) {
    log = l
    if (!isRootDir(log)) {
        log("Exit. Deluge root directory not found. WORKING_DIR: " + WORKING_DIR)
        return false;
    }
    getAudioFileTree(function() {
        findMissing()
        onSuccess()
    })

}

exports.dirCheck = function(l) {
    log = l
    // add chooseable workdir later..
    log('Working directory: ' + remote.app.getAppPath())
    log("process cwd: " + process.cwd())
    return isRootDir()
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

        log("Beware: Some Deluge folders are missing: " + missingDirs.join(","))

        return false
    }
    return true
}

function findMissing(onSuccess) {
    DELUGE_XML_PATHS.forEach(function(p) {
        delugeXmls[p] = parseFilenames(p)

    })
    //console.log(" deluge analysis ", usedSamples, usedSamples.SONGS)
    //console.log(existingSamples)
    getMissing()
    //console.log("missing ");
    //console.log(missing)
    let map = locateMissing()
    fixMissing(map)
    printResults()

    return missing;
}

function getMissing() {
    for (folder in delugeXmls) {
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
    let missingCnt = Object.keys(missing).length
    log("Total samples in " + DELUGE_XML_PATHS.join(', ') + ": " + total)
    if (missingCnt == 0) {
        log("<br><br>Null sweat chummer, all your sample paths are chill.")
    } else {
        log("<br><br>Drek chummer, some samples are fragged.")
        log("<pre>" + helpers.syntaxHighlight(missing) + "</pre>")

        let ambigCount = Object.keys(missingReport.ambiguous).length
        let notFoundCount = missingReport.notFound.length
        if (notFoundCount > 0 || ambigCount > 0) {
            log("Of " + missingCnt + "samples " + (notFoundCount + ambigCount) + " are not fixed.")
                if (notFoundCount > 0) {
                    log("Not found samples:" + missingReport.notFound.join(", "))
                }
                if (notFoundCount > 0) {
                    log("Ambiguous samples:" + JSON.stringify(missingReport.ambiguous))
                }
            }
            else {
                log("Null sweat chummer I got your hoop, all your sample paths are chill now.")
            }


        }

    }

    function fixMissing(map) {
        // console.log("fix missingaa")
        // console.log(map)
        let xmlsToWrite = {}

        for (folder in delugeXmls) {
            let xmlFiles = Object.keys(delugeXmls[folder]);
            xmlFiles.forEach(function(file) {
                if (missing[file]) {
                    // console.log("process " + file)
                    //console.log(delugeXmls[folder][file])

                    //let xml = toXml(delugeXmls[folder][file].json)

                    let fixedJson = fixJson(delugeXmls[folder][file].json, map)
                    if (fixedJson != null) {
                        //  console.log(delugeXmls[folder][file])
                        //console.log("write that shit", fixedJson)
                        let xml = toXml(fixedJson)
                        //console.log(xml)
                        writeXmlFile(file, xml)
                    }

                }

            })
        }
    }

    function writeXmlFile(xmlFile, fixedXml) {
        // create Backup!!

        for (folder in delugeXmls) {
            let xmlFiles = Object.keys(delugeXmls[folder]);
            xmlFiles.forEach(function(file) {
                if (file == xmlFile) {
                    console.log(delugeXmls[folder][file].fullPath)
                    let fullPath = delugeXmls[folder][file].fullPath
                    if (fs.existsSync(fullPath)) {
                        fs.writeFileSync(fullPath, fixedXml, 'utf8')
                        console.log("written file ", fullPath)
                    } else {
                        console.log("Error could not write to file ", xmlFile)
                    }
                }

            })
        }
    }




    function fixJson(obj, map) {

        hasReplacements = false
        objIterator.forAll(obj, function(path, key, obj) {
            if (key == DELUGE_FILENAME_PROP) {
                //console.log('----------');
                //console.log('path: ', path);
                //console.log('key: ', key);
                //console.log('value before processing: ', obj[key]);
                if (map[obj[key]]) {
                    obj[key] = map[obj[key]]
                    console.log("replaced sample path! " + obj[key])
                    hasReplacements = true
                }

            }
        });
        return hasReplacements ? obj : null;


        // write xml return obj

    }




    function locateMissing() {
        log("Locate missing..")
        let resultMapping = {} // missing -> found
        for (let xmlFile in missing) {
            let samplePaths = missing[xmlFile]
            samplePaths.forEach(function(p) {
                let name = getFileNameFromPath(p)
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

        //let parts = path.split("/")  parts[parts.length - 1]);

        /*
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
         */
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

        //console.log("x", filenames)
        filenames.forEach(function(filename) {
            //console.log(dirname + "+" + filename)
            if (filename.match(/\.XML$/i) == null) {
                return;
            }
            let fP = path.normalize(dirname + "/" + filename)
            let buf = fs.readFileSync(fP, 'utf8')

            let json = toJson(buf)
            //console.log(buf)
            extractFileNames(json, sampleNames, filename)
            total += sampleNames.length
            files[filename] = { 'json': json, 'xml': buf, 'fullPath': fP, 'sampleNames': sampleNames.filter(onlyUnique) };
        });

        return files;
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
        //console.log(j)

        return '<?xml version="1.0" encoding="UTF-8"?>\n' + x2js.js2xml(j, "\t");
    }