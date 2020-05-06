#! /bin/sh

OIFS="$IFS"
IFS=$'\n'

NOTES=( )
function note_table () {
	#deluge note names

   	octave=( C C# D D# E F F# G G# A A# H )
	count=0
	for count in {0..10}; do
		for i in "${octave[@]}"; do
			displOct=$((count-1))
			NOTES+=("$i$displOct")
		done
	done
}
note_table

WORKING_DIR="./"
for instrument in $(find "$WORKING_DIR/" -type d -mindepth 1 -maxdepth 1 | sort ); do
	instName=$(basename "$instrument")
	instNameRaw="${instName/-*/}"

	for wavOrig in $(find "$WORKING_DIR/$instrument" -type f -maxdepth 1 -iname '*.wav' | sort ); do
		wav=$(basename "$wavOrig")
		notename="$(echo $wav | rev | cut -d' ' -f 1 | rev)"
		notename="${notename/.wav/}"
		cnt=0
		for i in "${NOTES[@]}"; do
			if [[ "$i" = $notename ]]; then
				echo "$WORKING_DIR/$instrument/$cnt.${NOTES[$cnt]}.wav"
				#mv "$wavOrig" "$WORKING_DIR/$instrument/$cnt.${NOTES[$cnt]}.wav"
			fi
			cnt=$((cnt + 1)) 
		done

	done
    

done


IFS="$OIFS"