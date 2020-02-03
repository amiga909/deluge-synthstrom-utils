#! /bin/sh

## Convert DAW multisample recordings to Deluge multisamples
## Helper
##


WORKING_DIR="."

tokenSkipLowerUpper="--skip12lowerupper"
tokenSkipUpper="--skip12upper"
tokenSkipLower="--skip12lower"
octave=( c c# d d# e f f# g g# a a# h )

echo "-----------------------------"
folderSize="$(du -ch ./*/*.wav | grep total | cut -f1 | sed -e 's/ //g')"
echo "All instruments size BEFORE: $folderSize"
 
echo "-----------------------------"
echo "Optimizing instrument size..."
for instrument in $(find "$WORKING_DIR/" -type d -maxdepth 1 -iname '*--skip12*' | sort ); do
	instName=$(basename -- "$instrument")
	instNameRaw="${instName/-*/}"
	folderSize="$(du -hs $instrument | cut -f1 | sed -e 's/ //g')"

	echo "-----------------------------"
	echo "Processing $instNameRaw ($instName) $folderSize"

	# limit note range, remove noisy/bad parts (too low, boring upper, ..)
	if [[ $instName =~ "C0H7-96" ]]; then
		if [[ $instName =~ $tokenSkipLowerUpper ]]; then
			for i in "${octave[@]}"; do
					rm -f "$WORKING_DIR"/"$instName"/*"$i"0.wav	 
					rm -f "$WORKING_DIR"/"$instName"/*"$i"7.wav
			done
			
		elif [[ $instName =~  $tokenSkipLower ]]; then
			for i in "${octave[@]}"; do
					rm -f "$WORKING_DIR"/"$instName"/*"$i"0.wav
			done
		elif [[ $instName =~  $tokenSkipUpper ]]; then
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

	# limit octaves based on size
	folderSize="$(du -hs $instrument | cut -f1 | sed -e 's/ //g' | sed -e 's/M//g')"
	folderSize=$((folderSize + 0))
	if [ "$folderSize" -gt 50 ]; then
		#remove black keys
		for count in {0..10}; do
			rm -f "$WORKING_DIR"/"$instName"/*#*.wav
		done
	fi 
	
	folderSize="$(du -hs $instrument | cut -f1 | sed -e 's/ //g')"
	fileCount="$(ls -1q "$instrument" | wc -l | sed -e 's/ //g')" 
	outputDir="$instNameRaw-$fileCount--$folderSize"
	mv $instrument $outputDir
done

folderSize="$(du -ch ./*/*.wav | grep total | cut -f1 | sed -e 's/ //g')"
echo "All instruments size AFTER: $folderSize"
