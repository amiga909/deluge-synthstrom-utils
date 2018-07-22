const seekOrphans = require('./sampleOrphans');



var isLoading = false;

onload = function() {

	$( document ).ready(function() {
   let $seekOff = $("#seek-off")
	let $seekOn = $("#seek-on")

	let $seekOffImg = $("#seek-off-img")
	let $seekOnImg = $("#seek-on-img")


    $seekOff.on("click", () => {
    	console.log("clicked jq")
    	$seekOff.hide()
    	$seekOn.show()
    })
    $seekOn.on("click", () => {
    	console.log("clicked jq")
    	$seekOn.hide()
    	$seekOff.show()
    })
});
	



}