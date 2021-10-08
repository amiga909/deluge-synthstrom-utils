const fs = require("fs"),
	path = require("path");
const helpers = require('./xml-helpers')


const DELUGE_SAMPLES_ROOT = "SAMPLES/multis/emu"
const PROCESSING_FOLDER = "XLead"
const ROOT_FOLDER = __dirname
const WORKING_DIR = __dirname + "/" + PROCESSING_FOLDER
const DELUGE_PRESET_NAMESPACE = "eX"
const TEMPLATE = fs.readFileSync(__dirname + "/template.XML", 'utf8');


const TEMPLATE_JSON = helpers.toJson(TEMPLATE)



let dirs = fs.readdirSync(WORKING_DIR, {
	withFileTypes: true
});
dirs = dirs.filter((d) => {
	return d.isDirectory();
});

const WaveFile = require('wavefile').WaveFile;



dirs.forEach(category => {
	let currentPath = WORKING_DIR + "/" + category.name;
	//console.log("currentPath", currentPath);
	wavFolders = fs.readdirSync(currentPath, {
		withFileTypes: true
	});
	wavFolders = wavFolders.filter((d) => {
		return d.isDirectory();
	});
	wavFolders.forEach(wavFolder => {
		console.log("------- " + wavFolder.name);

		let wavs = fs.readdirSync(currentPath + "/" + wavFolder.name, {
			withFileTypes: true
		});
		wavs = wavs.filter((w) => {
			return [".wav", ".aif", ".aiff"].includes(path.extname(w.name).toLowerCase());
		});
		const ranges = [];
		const commonSubstring = common_substring(wavs.map((w) => {
			return w.name
		}))

		wavs.forEach(wav => {
			const buffer = fs.readFileSync(currentPath + "/" + wavFolder.name + "/" + wav.name);
			const waveFile = new WaveFile();
			waveFile.fromBuffer(buffer);
			const sampleLength = Math.floor(waveFile.chunkSize / 4) // - 10;
			const midiNo = helpers.getMidiNoFromFilename(wav.name, commonSubstring);
			const payload = {
				sampleRange: {
					zone: {
						_startSamplePos: 0,
						_endSamplePos: sampleLength
					},
					_rangeTopNote: midiNo, // omit if last
					_fileName: `${DELUGE_SAMPLES_ROOT}/${PROCESSING_FOLDER}/${category.name}/${wavFolder.name}/${wav.name}`,
					_transpose: 60 - midiNo,
					// _cents: '-44'
				}
			}
			ranges.push(payload)
		});
		// rewrite samplerange
		ranges.sort((a, b) => (a._rangeTopNote > b._rangeTopNote) ? 1 : ((b._rangeTopNote > a._rangeTopNote) ? -1 : 0))
		const newXmlFile = TEMPLATE_JSON;
		newXmlFile.sound.osc1.sampleRanges = ranges; // .sampleRange


		newXmlFile.sound.defaultParams.envelope1.release = helpers.getDelugeReleaseTime(category.name);
		helpers.writeXmlFile(newXmlFile, `${ROOT_FOLDER}/XML/${DELUGE_PRESET_NAMESPACE}.${category.name.substring(0, category.name.length - 1)}.${wavFolder.name}`)
	});

});

function common_substring(data) {
	var i, ch, memo, idx = 0
	do {
		memo = null
		for (i = 0; i < data.length; i++) {
			ch = data[i].charAt(idx)
			if (!ch) break
			if (!memo) memo = ch
			else if (ch != memo) break
		}
	} while (i == data.length && idx < data.length && ++idx)
	return (data[0] || '').slice(0, idx)
}