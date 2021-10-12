const fs = require("fs"),
	path = require("path");
const helpers = require('./xml-helpers')

const MIN_SAMPLE_LENGTH = 3; //3; 
const DELETE_MIN_SAMPLE_SOURCE = true;
const DELUGE_SAMPLES_ROOT = "SAMPLES/multis/emu"
const PROCESSING_FOLDER = "WorldExp"
const DELUGE_PRESET_NAMESPACE = "eW"

const XML_EXPORT_FOLDER = "XML";
const ROOT_FOLDER = __dirname
const WORKING_DIR = __dirname + "/" + PROCESSING_FOLDER
const TEMPLATE = fs.readFileSync(__dirname + "/template.XML", 'utf8');
const TEMPLATE_JSON = helpers.toJson(TEMPLATE)
const stats = {
	lengths: {}
};

let dirs = fs.readdirSync(WORKING_DIR, {
	withFileTypes: true
});
dirs = dirs.filter((d) => {
	return d.isDirectory();
});

const WaveFile = require('wavefile').WaveFile;



dirs.forEach(category => {
	let currentPath = WORKING_DIR + "/" + category.name;
	console.log("category", currentPath);
	wavFolders = fs.readdirSync(currentPath, {
		withFileTypes: true
	});
	wavFolders = wavFolders.filter((d) => {
		return d.isDirectory();
	});
	wavFolders.forEach(wavFolder => {


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

		let lengthRange = 0;
		wavs.forEach(wav => {
			const buffer = fs.readFileSync(currentPath + "/" + wavFolder.name + "/" + wav.name);
			const waveFile = new WaveFile();
			waveFile.fromBuffer(buffer);
			const sampleLength = Math.floor(waveFile.chunkSize / 4) // - 10;
			lengthRange = Math.floor((sampleLength / 100000) * 2.5);
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
		ranges.sort((a, b) => (a._rangeTopNote > b._rangeTopNote) ? 1 : ((b._rangeTopNote > a._rangeTopNote) ? -1 : 0))
		const newXmlFile = TEMPLATE_JSON;

		newXmlFile.sound.osc1.sampleRanges = ranges; 
		newXmlFile.sound.defaultParams.envelope1.release = helpers.getDelugeReleaseTime(category.name);

		stats.lengths[lengthRange] = stats.lengths[lengthRange] ? stats.lengths[lengthRange] + 1 : 1;
		if (lengthRange > MIN_SAMPLE_LENGTH) {
			const xmlFileName = `${ROOT_FOLDER}/${XML_EXPORT_FOLDER}/${DELUGE_PRESET_NAMESPACE}.${category.name.substring(0, category.name.length - 1)}.${wavFolder.name}`
			helpers.writeXmlFile(newXmlFile, xmlFileName)
		} else {
			if (DELETE_MIN_SAMPLE_SOURCE) {
				console.log("delete samples: ", currentPath + "/" + wavFolder.name);
				fs.rmdirSync(currentPath + "/" + wavFolder.name, { recursive: true });
			} else {
				console.log(`skipped ${category.name}/${wavFolder.name}, lengthRange: ${lengthRange}`);
			}
		}


	});
	console.log("stats", stats);

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