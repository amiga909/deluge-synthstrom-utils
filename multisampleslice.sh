#! /bin/sh

## Convert DAW multisample recordings to Deluge multisamples

if ! [ -x "$(command -v sox)" ]; then
		echo 'Error: sox is not installed.'  
	  	exit 1
fi


# globals
NO_OF_NOTES=96
START_NOTE=12

ARG1_working_dir="$1"
WORKING_DIR="."
cd $WORKING_DIR

NOTES=( )
function note_table () {
	#deluge note names:
   	octave=( c c# d d# e f f# g g# a a# h )
	count=0
	for count in {0..10}
	do
		for i in "${octave[@]}"
		do
			displOct=$((count-1))
			NOTES+=("$i$displOct")
		done
	done
}
note_table

for f in $(find "$WORKING_DIR" -type f -maxdepth 1 -iname '*.wav' | sort -h ); do
	echo "-----------------------------"
	file_size=$(stat -f%z "$f")
	file_size=$((file_size + 0 ))
	file_size=$((file_size / 1000 / 1000 ))
	if [ 1 -gt "$file_size" ]; then
			echo "... Skip file $f size: $file_size MB"
			continue
	fi
	
	tempDir="$WORKING_DIR/temp"
	instrumentName=$(basename -- "$f")
	instrumentName=${instrumentName/.wav/}
	outputDir="$WORKING_DIR/$instrumentName"

	length=$(soxi -D "$WORKING_DIR/$f")
	sampleLength=$(bc -l <<< "$length/$NO_OF_NOTES")
	 
	rm -rf "$tempDir" && mkdir -p "$tempDir"
	echo "Processing $f ($length sec)"

	sox "$f" "$tempDir"/.wav silence 1 0.1 1% 1 0.8 1% : newfile : restart

	for f in $(find "$tempDir" -type f -maxdepth 1 -iname '*.wav'  ); do
		file_size=$(stat -f%z "$f")
		file_size=$((file_size + 0 ))
		file_size=$((file_size / 1000  ))
		if [ 10 -gt "$file_size" ]; then
			rm -f "$f"
			echo "Deleted $f | size $file_size KB"
		fi
	done

	# name wav files if sample count is correct
	tempDirCount="$(ls -1q "$tempDir" | wc -l)" 
	tempDirCount=$((tempDirCount + 0))
	if [ "$tempDirCount" == "$NO_OF_NOTES" ]; then
		outputDir="$outputDir-C0H7-$NO_OF_NOTES"
		cnt=$((START_NOTE))
		for f in $(find "$tempDir" -type f -maxdepth 1 -iname '*.wav' | sort ); do
			displayPath="$(echo "$f" | sed -E 's/\.\/\///g')"
		 	mv $f "$tempDir/$instrumentName.$cnt.${NOTES[$cnt]}.wav"	
		 	cnt=$((cnt + 1))	
		done
	else 
		echo "!Error sample count. Expected: $NO_OF_NOTES Have: $tempDirCount"
		outputDir="$outputDir-$tempDirCount"
	fi

	rm -rf "$outputDir"
	mv "$tempDir" "$outputDir"

	echo "Finished $instrumentName"
	
	


done

rm -rf "$tempDir"
echo "-----------------------------"
echo "done"
