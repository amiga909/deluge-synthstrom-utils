#! /bin/sh

## Convert DAW multisample recordings to Deluge multisamples
##
## https://github.com/rochars/wavefile/blob/master/lib/wavefile-tag-editor.js


if ! [ -x "$(command -v sox)" ]; then
		echo 'Error: sox (sox.sourceforge.net) is not installed.'  
	  	exit 1
fi

#if [ -z "$1" ]; then
#	WORKING_DIR="$1"  
#fi

# globals
WORKING_DIR="."
cd $WORKING_DIR
NO_OF_NOTES=96
START_NOTE=12
MIN_CHUNK_FILE_SIZE_KB=30
TEMP_DIR="$WORKING_DIR/temp"
TEMP_WAV="temp.wav"
TEMP_WAV1="temp1.wav"
rm -rf "$TEMP_WAV" && rm -rf "$TEMP_DIR"

NOTES=( )
function note_table () {
	#deluge note names
   	octave=( c c# d d# e f f# g g# a a# h )
	count=0
	for count in {0..10}; do
		for i in "${octave[@]}"; do
			displOct=$((count-1))
			NOTES+=("$i$displOct")
		done
	done
}
note_table


for recording in $(find "$WORKING_DIR" -type f -maxdepth 1 -iname '*.wav' | sort -h ); do
	rm -rf "$TEMP_DIR" && mkdir -p "$TEMP_DIR" 
	rm -f "$TEMP_WAV" && rm -f "$TEMP_WAV1"

	echo "-----------------------------"
	file_size=$(stat -f%z "$recording")
	file_size=$((file_size + 0 ))
	file_size=$((file_size / 1000 / 1000 ))
	if [ 1 -gt "$file_size" ]; then
			echo "... Skip file $recording size: $file_size MB"
			continue
	fi
	
	instrumentName=$(basename -- "$recording")
	instrumentName=${instrumentName/.wav/}
	outputDir="$WORKING_DIR/$instrumentName"
	
	echo "Levelling $recording ($file_size MB)..."
	sox -v 0.75 $recording "$TEMP_WAV" compand .01,.3 -6,-4,-3,-3,0,-3 
	sox --norm="-0.15" "$TEMP_WAV" "$TEMP_WAV1" 
	mv $TEMP_WAV1 $TEMP_WAV

	sliceThreshold=1
	if [[ $instrumentName =~ "--threshold" ]]; then
		#INT must be at end of filename
		token="${instrumentName/*--threshold/}"
		sliceThreshold=$((token + 0))
	fi 

	echo "Splitting ..."
	sox "$TEMP_WAV" "$TEMP_DIR"/.wav silence 1 0.1 "$sliceThreshold"% 1 0.8 "$sliceThreshold"% : newfile : restart
	

	# Remove faulty files and normalize audio
	for f in $(find "$TEMP_DIR" -type f -maxdepth 1 -iname '*.wav' | sort ); do
		file_size=$(stat -f%z "$f")
		file_size=$((file_size + 0 ))
		file_size=$((file_size / 1000  )) # KB
		if [ "$MIN_CHUNK_FILE_SIZE_KB" -gt "$file_size" ]; then
			rm -f "$f"
			echo "Deleted $f | size $file_size KB"
		else 
			sox "$f" "$TEMP_WAV" contrast 0
			sox -v 0.99 "$TEMP_WAV" "$f" fade 0.01 -0 0.01
		fi
	done


	# Name wav files if sample count is correct
	tempDirCount="$(ls -1q "$TEMP_DIR" | wc -l)" 
	tempDirCount=$((tempDirCount + 0))
	if ! [ "$tempDirCount" == "$NO_OF_NOTES" ]; then
		echo "!Error sample count. Expected: $NO_OF_NOTES Have: $tempDirCount"
	fi
	outputDir="$outputDir-C0-$NO_OF_NOTES"
	cnt=$((START_NOTE))
	for f in $(find "$TEMP_DIR" -type f -maxdepth 1 -iname '*.wav' | sort ); do
		displayPath="$(echo "$f" | sed -E 's/\.\/\///g')"
		mv $f "$TEMP_DIR/$cnt.${NOTES[$cnt]}.wav"	
		cnt=$((cnt + 1))	
	done

	# Mono-fy bass sounds
	if [[ $instrumentName =~ "bass" ]]; then
		echo "Convert $instrumentName to mono (file name pattern: bass)"
	 	for f in $(find "$TEMP_DIR" -type f -maxdepth 1 -iname '*.wav' | sort ); do
	 		#-v 0.99: sox WARN dither
	 	    sox -v 0.99 "$f" -c 1 "$TEMP_WAV"
	 		mv $TEMP_WAV $f
	 	done
	fi	
	folderSize="$(du -hs $TEMP_DIR | cut -f1 | sed -e 's/ //g')"
	outputDir="$outputDir-$folderSize"

	rm -rf "$outputDir"
	mv "$TEMP_DIR" "$outputDir"
		
	echo "Finished $instrumentName"
done



echo "-----------------------------"
echo "done"
# du argument list too long
#folderSize="$(find . -maxdepth 2 -mindepth 2  -name "*.wav" -exec du -ks {} \; | awk '{ total = total + $1 } END { print total }')" 
folderSize="$(du -ch ./*/*.wav |  grep total | cut -f1 | sed -e 's/ //g')"
echo "All instruments size: $folderSize"
rm -rf "$TEMP_DIR"
rm -f "$TEMP_WAV"

#sh multisample-optimizesize.sh



