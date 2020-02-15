#! /bin/sh

## Convert DAW multisample recordings to Deluge multisamples
## Helper
##
WORKING_DIR="."
MAX_INSTRUMENT_SIZE_MB=80
tokenSkipLowerUpper="--skip12lowerupper"
tokenSkipUpper="--skip12upper"
tokenSkipLower="--skip12lower"
octave=( c c# d d# e f f# g g# a a# h )
 
echo "-----------------------------"
echo "Optimizing instrument size..."
folderSizeBefore="$(du -ch ./*/*.wav | grep total | cut -f1 | sed -e 's/ //g')"

# 1) Cut bad recordings (sometimes lowest and hightes octaves sound very bad)
for instrument in $(find "$WORKING_DIR/" -type d -maxdepth 1 -iname '*--skip*' | sort ); do
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
		elif [[ $instName =~  "--skip24upper" ]]; then
			for i in "${octave[@]}"; do
					rm -f "$WORKING_DIR"/"$instName"/*"$i"7.wav
					rm -f "$WORKING_DIR"/"$instName"/*"$i"6.wav
			done
		elif [[ $instName =~  "--skip36upper" ]]; then
			for i in "${octave[@]}"; do
					rm -f "$WORKING_DIR"/"$instName"/*"$i"7.wav
					rm -f "$WORKING_DIR"/"$instName"/*"$i"6.wav
					rm -f "$WORKING_DIR"/"$instName"/*"$i"5.wav
			done
		elif [[ $instName =~  "--skip48upper" ]]; then
			for i in "${octave[@]}"; do
					rm -f "$WORKING_DIR"/"$instName"/*"$i"7.wav
					rm -f "$WORKING_DIR"/"$instName"/*"$i"6.wav
					rm -f "$WORKING_DIR"/"$instName"/*"$i"5.wav
					rm -f "$WORKING_DIR"/"$instName"/*"$i"4.wav
			done
		elif [[ $instName =~  "--skip60upper" ]]; then
			for i in "${octave[@]}"; do
					rm -f "$WORKING_DIR"/"$instName"/*"$i"7.wav
					rm -f "$WORKING_DIR"/"$instName"/*"$i"6.wav
					rm -f "$WORKING_DIR"/"$instName"/*"$i"5.wav
					rm -f "$WORKING_DIR"/"$instName"/*"$i"4.wav
					rm -f "$WORKING_DIR"/"$instName"/*"$i"3.wav
			done
		fi

	else 
		if [[ $instName =~ "--skip12lower" ]]; then
			for count in {1..12}; do
				deletee="$(printf "%03d\n" "$count")"
				rm -f "$WORKING_DIR"/"$instName"/"$deletee".wav
			done 
		fi
	fi
done



# 2) Remove every 2nd sample until size limit met
for instrument in $(find "$WORKING_DIR/" -type d -maxdepth 1 | sort ); do
	if [ $instrument = './' ]; then
	        continue
	fi  
	instName=$(basename -- "$instrument")
	instNameRaw="${instName/-*/}"
	folderSize="$(du -hs $instrument | cut -f1 | sed -e 's/ //g' | sed -e 's/M//g')"
	# remove float, cast to int
	folderSize="${folderSize/.*/}"
	folderSize=$((folderSize + 0))
	removeCounter=0
	while [[ "$folderSize" -gt "$MAX_INSTRUMENT_SIZE_MB" && "10" -gt "$removeCounter" ]]; do
		removeCounter=$((removeCounter + 1))
		echo "$instNameRaw -- Removing odd numbered samples"
		wavCount=0
		for wav in $(find "$instrument" -type f -maxdepth 1 -iname '*.wav' | sort -h ); do
			remainder=$(( wavCount % 2 ))
			if (( $wavCount % 2 )); then
				rm -f $wav
			fi 
			wavCount=$((wavCount + 1))
		done
		folderSize="$(du -hs $instrument | cut -f1 | sed -e 's/ //g' | sed -e 's/M//g')"
		folderSize="${folderSize/.*/}"
		folderSize=$((folderSize + 0))
	done

	folderSize="$(du -hs $instrument | cut -f1 | sed -e 's/ //g')"
	fileCount="$(ls -1q "$instrument" | wc -l | sed -e 's/ //g')" 
	outputDir="$instNameRaw-$fileCount--$folderSize"
	mv $instrument $outputDir
done

folderSize="$(du -ch ./*/*.wav | grep total | cut -f1 | sed -e 's/ //g')"
echo "All instruments size after: $folderSize | before: $folderSizeBefore"
