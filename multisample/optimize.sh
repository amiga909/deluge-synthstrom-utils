#! /bin/sh

## Convert DAW multisample recordings to Deluge multisamples
## Helper
## [PARAMS]
 # [1] = Integer; MAX_INSTRUMENT_SIZE_MB; Max allowed instrument size


MAX_INSTRUMENT_SIZE_MB=0
if [ ! -z "$1" ]; then
	MAX_INSTRUMENT_SIZE_MB="$1"  
	MAX_INSTRUMENT_SIZE_MB=$((MAX_INSTRUMENT_SIZE_MB + 0))
fi

if [ $MAX_INSTRUMENT_SIZE_MB = 0 ]; then
	MAX_INSTRUMENT_SIZE_MB=1000
fi

WORKING_DIR="."
tokenSkipLowerUpper="--skip12lowerupper"
tokenSkipUpper="--skip12upper"
tokenSkipLower="--skip12lower"
octave=( c c# d d# e f f# g g# a a# h )

## [PARAMS]
## [1] = Root folder where samples are stored on the SD Card
 
echo "-----------------------------"
folderSizeBefore="$(find . -maxdepth 2 -mindepth 2  -name "*.wav" -exec du -ks {} \; | awk '{ total = total + $1 } END { print total }')" 
folderSizeBefore=$(( folderSizeBefore / 1000 ))
echo "Optimizing instrument size... (size before: $folderSizeBefore MB)"

# 1) Cut bad recordings (sometimes lowest and hightes octaves sound very bad)
for instrument in $(find "$WORKING_DIR/" -type d -maxdepth 1 -iname '*--skip*' | sort ); do
	if [ $instrument = './' ]; then
		continue
	fi 
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
	folderSize="$(du -hs $instrument | cut -f1 | sed -e 's/ //g' | sed -e 's/M//g' | sed -e 's/K//g')"
	# remove float, cast to int
	folderSize="${folderSize/.*/}"
	folderSize=$((folderSize + 0))

	# remove every second note in every octave until max size reached
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

		# shake off very high octave notes first, usually not a sweet spot, keep C and F 
		i=0
		for i in "${octave[@]}"; do
			if [[ $i = "c"|| $i = "f" ]]; then
				continue
			fi
			if [[ "$removeCounter" = 1 ]]; then
				echo "$instNameRaw -- remove octave 7"
				rm -f "$WORKING_DIR"/"$instName"/*"$i"7.wav
			elif [[ "$removeCounter" = 2 ]]; then
				echo "$instNameRaw -- remove octave 6"
				rm -f "$WORKING_DIR"/"$instName"/*"$i"6.wav
			elif [[ "$removeCounter" = 3 ]]; then
				echo "$instNameRaw -- remove octave 5"
				rm -f "$WORKING_DIR"/"$instName"/*"$i"5.wav
			fi
		done
		
		folderSize="$(du -hs $instrument | cut -f1 | sed -e 's/ //g' | sed -e 's/M//g' | sed -e 's/K//g')"
		folderSize="${folderSize/.*/}"
		folderSize=$((folderSize + 0))
	done

	folderSize="$(du -hs $instrument | cut -f1 | sed -e 's/ //g')"
	fileCount="$(ls -1q "$instrument" | wc -l | sed -e 's/ //g')" 
	outputDir="$instNameRaw-$fileCount--$folderSize"
	if [ ! -d "$outputDir" ]; then
		echo "processed new $instNameRaw"
  		mv -f "$instrument" "$outputDir"
	fi
	
done


folderSize="$(find . -maxdepth 2 -mindepth 2  -name "*.wav" -exec du -ks {} \; | awk '{ total = total + $1 } END { print total }')" 
folderSize=$(( folderSize / 1000 ))
echo "All instruments size after: $folderSize MB  (size before: $folderSizeBefore MB)"
