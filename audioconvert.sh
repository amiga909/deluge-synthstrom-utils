#! /bin/sh

####
# Converts non 44hz .wav to 16bit 44hz
####


# hack to handle spaces in filenames
IFS='
'
set -f

if ! [ -x "$(command -v afinfo)" ]; then
	echo 'Error: afinfo is not installed.'  
   	exit 1
fi
if ! [ -x "$(command -v afconvert)" ]; then
	echo 'Error: afconvert is not installed.'  
  	exit 1
fi

 
if [ "$1" != "no-debug" ] ; then 
	echo '-----------------TEST MODE-----------------'
	echo "If the listing looks good, run normal mode: sh audioconvert.sh no-debug"
else 
	echo '----------------NORMAL MODE----------------'	
fi


for f in $(find ./ -type f -iname '*.wav'); do
	size=$(stat -f%z "$f") 
	size=$(($size / 1024)) 
	isInvalid=$(afinfo "$f" | grep -L "44100 Hz," )
	
	echo '------------------------'
	echo "$f ($size KB)"

	if ! [ "$isInvalid" = "" ]; then
	 
		#echo "$(afinfo $f)"
		if [ "$1" = "no-debug" ]; then
	    	afconvert -o "$f" -f 'WAVE' -d I16@44100 "$f"
	  		size=$(stat -f%z "$f") 
			size=$(($size / 1024)) 
	  		echo "converted ($size KB)"
	   else 
	   		echo "would be converted: $f"
	   fi
	fi

    
done

exit 1
