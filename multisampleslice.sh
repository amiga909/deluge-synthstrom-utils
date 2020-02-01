#! /bin/sh

## Convert DAW multisample recordings to Deluge multisamples
##
##


if ! [ -x "$(command -v sox)" ]; then
		echo 'Error: sox (sox.sourceforge.net) is not installed.'  
	  	exit 1
fi

#if [ -z "$1" ]; then
#	WORKING_DIR="$1"  
#fi

# globals
NO_OF_NOTES=96
START_NOTE=12
WORKING_DIR="."
cd $WORKING_DIR
tempDir="$WORKING_DIR/temp"
rm -rf "temp.wav" && rm -rf "$tempDir"

NOTES=( )
function note_table () {
	#deluge note names
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




for recording in $(find "$WORKING_DIR" -type f -maxdepth 1 -iname '*.wav' | sort -h ); do
	rm -rf "$tempDir" && mkdir -p "$tempDir" 
	rm -f "temp.wav" && rm -f "temp1.wav"

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
	sox -v 0.75 $recording "temp.wav" compand .01,.3 -6,-4,-3,-3,0,-3 
	sox --norm="-0.15" "temp.wav" "temp1.wav" 
	mv temp1.wav temp.wav

	echo "Splitting ..."
	sox "temp.wav" "$tempDir"/.wav silence 1 0.1 1% 1 0.8 1% : newfile : restart

	# Remove faulty files and normalize audio
	for f in $(find "$tempDir" -type f -maxdepth 1 -iname '*.wav' | sort ); do
		file_size=$(stat -f%z "$f")
		file_size=$((file_size + 0 ))
		file_size=$((file_size / 1000  )) # KB
		if [ 50 -gt "$file_size" ]; then
			rm -f "$f"
			#echo "Deleted $f | size $file_size KB"
		else 
			sox -v 0.99 $f "temp.wav" fade 0.001 -0 0.001
			mv temp.wav $f
		fi
	done


	# Name wav files if sample count is correct
	tempDirCount="$(ls -1q "$tempDir" | wc -l)" 
	tempDirCount=$((tempDirCount + 0))
	if [ "$tempDirCount" == "$NO_OF_NOTES" ]; then
		outputDir="$outputDir-C0H7-$NO_OF_NOTES"
		cnt=$((START_NOTE))
		for f in $(find "$tempDir" -type f -maxdepth 1 -iname '*.wav' | sort ); do
			displayPath="$(echo "$f" | sed -E 's/\.\/\///g')"
		 	mv $f "$tempDir/$cnt.${NOTES[$cnt]}.wav"	
		 	cnt=$((cnt + 1))	
		done

	else 
		echo "!Error sample count. Expected: $NO_OF_NOTES Have: $tempDirCount"
		outputDir="$outputDir-$tempDirCount"
	fi

	# Mono-fy bass sounds
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



echo "-----------------------------"
echo "Optimizing instrument size..."
for instrument in $(find "$WORKING_DIR/" -type d -maxdepth 2 -iname '*--skip12*' | sort ); do
	instName=$(basename -- "$instrument")

	if [[ $instName =~ "C0H7-96" ]]; then
	echo "Limiting sample range for instrument $instName ..."
	
		if [[ $instName =~ "--skip12lower" ]]; then
			for i in "${octave[@]}"; do
					rm -f "$WORKING_DIR"/"$instName"/*"$i"0.wav	 
			done
		fi
		if [[ $instName =~  "--skip12upper" ]]||[[ $instName =~  "--skip12lowerupper" ]]; then
			for i in "${octave[@]}"; do
					rm -f "$WORKING_DIR"/"$instName"/*"$i"7.wav
			done
		fi
	else 
		if [[ $instName =~ "--skip12lower" ]]; then
			len=${#octave[@]}
			for (( i=0; i<$len; i++ )); do 
				addZero="0"
				if [ "$i" -gt 9 ]; then
					addZero=""
				fi
				rm -f "$WORKING_DIR"/"$instName"/"$addZero"0"$i".wav
			done
		fi
	fi
done

# remove every 2nd note from every instrument over 50MB




echo "-----------------------------"
echo "done"
folderSize="$(du -ch ./*/*.wav |  grep total | cut -f1 | sed -e 's/ //g')"
echo "All instruments size: $folderSize"
rm -rf "$tempDir"
rm -f "temp.wav"

