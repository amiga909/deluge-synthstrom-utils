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
tempDir="$WORKING_DIR/temp"
rm -rf "temp.wav" && rm -rf "$tempDir"

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
	
	instrumentName=$(basename -- "$f")
	instrumentName=${instrumentName/.wav/}
	outputDir="$WORKING_DIR/$instrumentName"
	 
	rm -rf "$tempDir" && mkdir -p "$tempDir"
	echo "Levelling $f ($file_size MB)..."

	#https://thewhackhacker.wordpress.com/2018/09/26/companding-with-sox/
	originalFilesDir="$WORKING_DIR/_originalFiles"
	mkdir -p "$originalFilesDir"      
	cp $f "$originalFilesDir/$f"        
	#-91,-90,-10     .1,.1 -60,-10 0 0 .1    compand 0,.1 -70,-60,-20
	sox -v 0.75 $f "temp.wav" compand .01,.3 -6,-4,-3,-3,0,-3 
	sox --norm="-0.15" "temp.wav" "temp1.wav" 
	mv temp1.wav $f
	rm -f temp.wav

	echo "Splitting ..."
	#sox $f "$tempDir"/.wav trim 0 $sampleLength : newfile : restart
	#sox "$f" "$tempDir"/.wav silence 1 0.5 1% 1 0.8 1% : newfile : restart
	sox "$f" "$tempDir"/.wav silence 1 0.1 1% 1 0.8 1% : newfile : restart

	for f in $(find "$tempDir" -type f -maxdepth 1 -iname '*.wav' | sort ); do
		file_size=$(stat -f%z "$f")
		file_size=$((file_size + 0 ))
		file_size=$((file_size / 1000  ))
		if [ 10 -gt "$file_size" ]; then
			rm -f "$f"
			#echo "Deleted $f | size $file_size KB"
			continue

		fi
		sox -v 0.99 $f "temp.wav" fade 0.001 -0 0.001
		mv temp.wav $f
		
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

		#@TODO remove octaves 
		#for f in $(find "$tempDir" -type f -maxdepth 1 -iname '*.wav' | sort ); do
		#done

	else 
		echo "!Error sample count. Expected: $NO_OF_NOTES Have: $tempDirCount"
		outputDir="$outputDir-$tempDirCount"
	fi

	if [[ $instrumentName =~ "bass" ]]; then
		echo "Convert $instrumentName to mono"
	 	for f in $(find "$tempDir" -type f -maxdepth 1 -iname '*.wav' | sort ); do
	 		#-v 0.99: sox WARN dither
	 	    sox -v 0.99 "$f" -c 1 "temp.wav"
	 		mv temp.wav $f
	 	done
	fi	
	folderSize="$(du -hs $tempDir | cut -f1 | sed -e 's/ //g')"
	outputDir="$outputDir--$folderSize"

	rm -rf "$outputDir"
	mv "$tempDir" "$outputDir"
	

	echo "Finished $instrumentName"
	

done

rm -rf "$tempDir"
echo "-----------------------------"
echo "done"
