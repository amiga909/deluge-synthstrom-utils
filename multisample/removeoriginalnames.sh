#! /bin/sh

WORKING_DIR="./"
for instrument in $(find "$WORKING_DIR/" -type d -mindepth 1 -maxdepth 1 | sort ); do
	instName=$(basename "$instrument")
	instNameRaw="${instName/-*/}"
    array=(${instNameRaw//./ })
    instType="${array[1]}"
    instName="${array[3]}"
    
	mv $instrument "$instType.$instName"

done
