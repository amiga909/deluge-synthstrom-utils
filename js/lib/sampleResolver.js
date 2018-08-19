let WORKING_DIR = ''
let currentXml = ''

exports.run = function run(dir, writeMapping) {
	WORKING_DIR = dir
	console.log(writeMapping)
	let html = ''
    let p = path.normalize(WORKING_DIR + "/SAMPLES/drm.wav")

    //audioPlayer.play();
    /*
    let html =`<audio controls="controls" id="audio">
    <source src="${p}" type="audio/wav" />
    </audio>`;
    */
    $(".header-intro").html(html)
}

// what i first need: every xml ask to correct or not


// is sample was selected, check if selection applies to other samples too.
function applyToAll(){}