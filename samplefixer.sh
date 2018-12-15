#! /bin/sh

#### 
# Uses afconvert instead of ffmpeg
####


# hack to handle spaces in filenames
IFS='
'
set -f

# globals
ARG1_runmode="$1"
ARG2_path="$2"
if [ -z "$2" ]; then
	ARG2_path="./" 
fi
WORKING_DIR="$ARG2_path"
IS_FILE_WRITE_MODE="0"

af16bit44hz="LEI16@44100"
af8bit44hz="UI8@44100"
# Deluge records 44hz/24bit
af24bit44hz="LEI24@44100"
af32bit44hz="LEI32@44100"
af64bit44hz="LEF64@44100"
# default: 16 bit is usually enough
targetFormat="LEI16@44100"

lB="-----------------"
minSampleRate=44100
totalIncrease=0
count=0
convCount=0
skippedCount=0 




libcheck() {
	if ! [ -x "$(command -v afinfo)" ]; then
		echo 'Error: afinfo is not installed.'
	   	exit 1
	fi
	if ! [ -x "$(command -v afconvert)" ]; then
		echo 'Error: afconvert is not installed.'  
	  	exit 1
	fi
} 
workingDirCheck() {

	# allow to place script in Deluge root, rather than samples folder
	if  ! [ -d "${PWD}/SAMPLES/RESAMPLE" ]; then
		echo "Note: If you want to process all files, place script in root directory of SD card."
		echo "$lB"
	else 
		cd "${PWD}/SAMPLES" || exit
	fi


	# let user input with or without slashes
	if [ -z "$2" ]; then
		inputDirNoSlash="$(echo "${ARG2_path}" | sed -E 's/^\///g' | sed -E 's/\/$//g')"
		if ! [ -d "${inputDirNoSlash}/" ]; then
			echo "Error. Illegal Path argument. ${PWD}/${inputDirNoSlash} does not exist"
			exit 
		else 
			WORKING_DIR="$inputDirNoSlash"
	fi 
	  
	fi
	
}
clean(){
	total=0
	echo "Listing non-audio samples by extension."
	echo "Allowed file extensions: .wav, .aif, .aiff"
	
	for f in $(find "$WORKING_DIR" -type f -not -iname '*.wav' -and -not -iname '*.aif' -and -not -iname '*.aiff'); do
		echo "$lB"
		size=0
		if [ -f "$f" ]; then
			size=$(stat -f%z "$f")
		fi
		size=$(stat -f%z "$f") 
		size=$(($size / 1024))
		displayPath="$(echo "$f" | sed -E 's/\.\/\///g')"

		total=$((size+total))
		echo "${displayPath} | $size KB "
		echo "Invalid file type"
		if [ "$IS_FILE_WRITE_MODE" = "1" ]; then
			rm -f "$f"
			echo "Deleted."
		fi
	done

	echo "$lB"
	echo "Total disk space usage: $total KB"

	echo "Testing audio files."
	for f in $(find "$WORKING_DIR" -type f -iname '*.wav' -or -iname '*.aif' -or -iname '*.aiff'); do
		isValid="1"

		size=$(stat -f%z "$f") 
		if [ "$size" = "" ]; then
			size="1"
			echo "found one $f"
		fi
	
		size=$(($size / 1024))
		displayPath="$(echo "$f" | sed -E 's/\.\/\///g')"

		{  
	    	afInfo="$(afinfo "$f")"
	    	# Regular afinfo output containts a file type
	    	checkOutput="$(echo "$afInfo" | grep -o 'File type ID:')"
			if [ "$checkOutput" = "" ]; then
				isValid="0"
				echo "Invalid afinfo output."
			fi
	    	
		} || {  
			isValid="0"
		}

		if [ "$isValid" = "0" ]; then
			echo "$lB"
	 		echo "Error. Invalid audio file."
		 	total=$((size+total))
			echo "/${displayPath} | $size KB "
		
			if [ "$IS_FILE_WRITE_MODE" = "1" ]; then
				rm "$f"
				echo "Deleted."
			fi	
		fi
	done

	totalMb=$(($total / 1024))
	echo "$lB"
	echo "Total disk space usage: $total KB | $totalMb MB"
}


convert(){
	for f in $(find "$WORKING_DIR" -type f -iname '*.wav'); do
		count=$((count+1))
		displayPath="$(echo "$f" | sed -E 's/\.\/\///g')"

		{  
		    afInfo="$(afinfo "$f")"

		} || {  
			echo "$lB"
			echo "${displayPath}"
		 	echo "Error. Invalid file. Skip $displayPath"
			skippedCount=$((skippedCount+1))
			continue 
		}

		dataFormat="$(echo "$afInfo" | grep -o 'Data format: .*')"
		bitDepthInfo="$(echo "$afInfo" | grep -o 'source bit depth: I.*')"
		sampleRate="$(echo "$dataFormat"| grep -o '[0-9]\{3,7\} Hz' | grep -o '[0-9]\{3,7\}' )"
		bitDepth="$(echo "$bitDepthInfo"| grep -o '[0-9]\{1,2\}')"
		fishyMp3="$(echo "$dataFormat"| grep -o 'mp3')"
		fishyBits="$(echo "$dataFormat" | grep -o ' 0 bits')"

		if [[ $sampleRate -lt $minSampleRate || $fishyMp3 != "" || $fishyBits != "" ]]; then
			size=$(stat -f%z "$f") 
			sizeBefore=$(($size / 1024)) 

			echo "$lB"
			echo "${displayPath} | $sizeBefore KB | $sampleRate Hz ${bitDepth}bit"
	 
			if [ "$fishyMp3" != "" ]; then
				echo "Fishy MP3 Codec detected:"
				echo "$(echo "$dataFormat" | sed -e 's/ //g')"  
			fi

			if [ "$fishyBits" != "" ]; then
				echo "Fishy bits/channel detected:"
				echo "$(echo "$dataFormat" | sed -e 's/ //g')" 
			fi

			if [ "$IS_FILE_WRITE_MODE" = "fix" ]; then
				convCount=$((convCount+1))
				# saving disk space with lower original bit depth does not seem to work well..
				targetFormat="$af16bit44hz"	
				bitDepth="16"

		    	afconvert -o "$f" -f 'WAVE' -d "$targetFormat" "$f"
		  		size=$(stat -f%z "$f") 
				size=$(($size / 1024))
				increase=$((size-sizeBefore))
				totalIncrease=$((increase+totalIncrease))

		  		echo "=> Converted to: $size KB | 44100 Hz 16 bit"
		   else 
		   		echo "=> Conversion candidate"
		   fi
		fi
	    
	done

	echo "$lB"
	echo "$convCount of $count files converted, $skippedCount skipped."
	totalIncreaseMb=$(($totalIncrease / 1024))
	echo "Total disk space usage: $totalIncrease KB | $totalIncreaseMb MB"
	echo "$lB"
}



welcome() {
	echo "${lB}DELUGE SAMPLE FIXER${lB}"
	libcheck
	workingDirCheck

	echo "Processing files in ${PWD}/${inputDirNoSlash}"
	echo "${lB}"
	
	if [ "$ARG1_runmode" = "convert" ]; then 
		echo 'DISCOVER UNSUPPORTED SAMPLES'
		echo "${lB}"
		convert 
	elif [ "$ARG1_runmode" = "clean" ]; then
		echo 'DISCOVER NON AUDIO FILES'
		echo "${lB}"
		clean
	elif [ "$ARG1_runmode" = "convert_write" ]; then
		IS_FILE_WRITE_MODE="1"
		echo 'CONVERT UNSUPPORTED SAMPLES (NO BACKUP, DISK USAGE!)'
		echo "${lB}"
		convert 
	elif [ "$ARG1_runmode" = "clean_write" ]; then	
		IS_FILE_WRITE_MODE="1"
		echo 'DELETE NON AUDIO FILES (NO BACKUP)'
		echo "${lB}"
		clean
	elif [ "$ARG1_runmode" = "convert_clean" ]; then
		echo 'DISCOVER UNSUPPORTED SAMPLES'
		echo "${lB}"
		convert 
		echo "${lB}"
		echo 'DISCOVER NON AUDIO FILES'
		echo "${lB}"
		clean
	elif [ "$ARG1_runmode" = "convert_clean_write" ]; then	
		IS_FILE_WRITE_MODE="1"
		echo 'CONVERT UNSUPPORTED SAMPLES (NO BACKUP, DISK USAGE!)'
		echo "${lB}"
		convert 
		echo "${lB}"
		echo 'DELETE NON AUDIO FILES (NO BACKUP)'
		echo "${lB}"
		clean
		
	else 
		echo 'HELP'
cat << EOF
#####Want a tidy sample library? 
- Place this script in the root directory of the SD Card
- Consider a backup before running any write commands
- Supported audio file extensions: .wav, .aif, .aiff

#####Use cases
- Analyze all data 
`sh samplefixer.sh convert_clean`

- Fix all data
`sh samplefixer.sh convert_clean_write`

Default path is the Deluge SAMPLES folder. You may pass a directory as an optional parameter. Pass it as relative path, e.g. `sh samplefixer.sh clean RESAMPLE/`, to narrow the search space. 

- **convert [PATH]**
List WAV files below 44kHz. Inspect for fishy data formats as well.

- **clean [PATH]**
List non-audio files and WAV samples Synthstrom Deluge might not be able to load.

- **convert_write [PATH]**
Convert WAV files lower than 44kHz to 44kHz/16bit. No backup! Attention, disk usage might increase a lot.

- **clean_write [PATH]**
Delete non audio files and WAV samples Synthstrom Deluge might not be able to load. No backup!


EOF
	fi
}


welcome 


 
exit 1
