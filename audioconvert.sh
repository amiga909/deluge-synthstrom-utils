#! /bin/sh

####
# Convert all WAV files with a sample rate lower than 44hz to 44hz/16bit 
####


# hack to handle spaces in filenames
IFS='
'
set -f


minSampleRate=44100
totalIncrease=0
count=0
convCount=0
skippedCount=0


if ! [ -x "$(command -v afinfo)" ]; then
	echo 'Error: afinfo is not installed.'  
   	exit 1
fi
if ! [ -x "$(command -v afconvert)" ]; then
	echo 'Error: afconvert is not installed.'  
  	exit 1
fi

if [ "$1" != "no-debug" ]; then 
	echo '-----------------TEST_MODE-----------------'
	echo "Simulation mode. For normal mode: sh audioconvert.sh no-debug"
else 
	echo '----------------NORMAL_MODE----------------'	
fi


if [ "$2" != "" ]; then 
	echo "$2"
fi

 
for f in $(find ./ -type f -iname '*.wav'); do
	count=$((count+1))

	{  
	    afInfo="$(afinfo "$f")"

	} || {  
		echo '------------------------'
	 	echo "Error. Invalid file. Skip $f"
		skippedCount=$((skippedCount+1))
		continue 
	}

	
	invalidWav="$(echo "$afInfo" | grep -o 'AudioFileOpenURL failed' )" 
	sampleRate="$(echo "$afInfo" | grep -o 'Data format: .*' | grep -o '[0-9]\{3,7\} Hz' | grep -o '[0-9]\{3,7\}' )"
	fishyMp3="$(echo "$afInfo" | grep -o 'Data format: .*' | grep "Hz, '.mp3' " )"

	if [[ $sampleRate -lt $minSampleRate  || $fishyMp3 != "" ]]; then
		size=$(stat -f%z "$f") 
		sizeBefore=$(($size / 1024)) 

		echo '------------------------'
		echo "$f $sizeBefore KB, $sampleRate Hz)"
 
		if [[ fishyMp3 != "" ]]; then
			echo "Fishy MP3 Codec detected."
		fi

		if [ "$1" = "no-debug" ]; then
			convCount=$((convCount+1))
	    	afconvert -o "$f" -f 'WAVE' -d I16@44100 "$f"
	  		size=$(stat -f%z "$f") 
			size=$(($size / 1024))
			increase=$((size-sizeBefore))
			totalIncrease=$((increase+totalIncrease))

	  		echo "Converted: $size KB"
	   else 
	   		echo "Converted in normal mode only"
	   fi
	fi
    
done

echo "$convCount of $count files converted, $skippedCount skipped. Total disk space increase: $totalIncrease KB"

exit 1
