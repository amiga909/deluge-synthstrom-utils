#! /bin/sh

## Create Deluge multisample XML preset file from folder of samples with named wavs
## Params
## 1 = Root folder where samples are stored on the SD Card

OIFS="$IFS"
IFS=$'\n'

if ! [ -x "$(command -v soxi)" ]; then
		echo 'Error: soxi (sox.sourceforge.net) is not installed.'  
	  	exit 1
fi

if [ ! -z "$1" ]; then
	DELUGE_SAMPLES_ROOT="$1"  
else 
	DELUGE_SAMPLES_ROOT="SAMPLES/_stTest________"
fi

WORKING_DIR="./"
DELUGE_PRESET_NAMESPACE="l"

# map Deluge 0-50, fixh format, https://docs.google.com/document/d/11DUuuE1LBYOVlluPA9McT1_dT4AofZ5jnUD5eHvj7Vs/edit
paramVals=(0x80000000 0x851EB851 0x8A3D70A2 0x8F5C28F3 0x947AE144 0x99999995 0x9EB851E6 0xA3D70A37 0xA8F5C288 0xAE147AD9 0xB333332A 0xB851EB7B 0xBD70A3CC 0xC28F5C1D 0xC7AE146E 0xCCCCCCBF 0xD1EB8510 0xD70A3D61 0xDC28F5B2 0xE147AE03 0xE6666654 0xEB851EA5 0xF0A3D6F6 0xF5C28F47 0xFAE14798 0x00000000 0x051EB83A 0x0A3D708B 0x0F5C28DC 0x147AE12D 0x1999997E 0x1EB851CF 0x23D70A20 0x28F5C271 0x2E147AC2 0x33333313 0x3851EB64 0x3D70A3B5 0x428F5C06 0x47AE1457 0x4CCCCCA8 0x51EB84F9 0x570A3D4A 0x5C28F59B 0x6147ADEC 0x6666663D 0x6B851E8E 0x70A3D6DF 0x75C28F30 0x7AE14781 0x7FFFFFD2)
RELEASE_TIME="${paramVals[10]}"
RELEASE_TIME_BASS="${paramVals[8]}"
RELEASE_TIME_BASS_SHORT="${paramVals[1]}"
RELEASE_TIME_LEAD="${paramVals[15]}"
RELEASE_TIME_PAD="${paramVals[26]}"
RELEASE_TIME_FX="${paramVals[18]}"

echo "-----------------------------"

# 1) Cut bad recordings (sometimes lowest and hightes octaves sound very bad)
for instrument in $(find "$WORKING_DIR/" -type d -mindepth 1 -maxdepth 1 | sort ); do
	instName=$(basename "$instrument")
	instNameRaw="${instName/-*/}"
	 
	sampleRangesStr=""
	hasValidFilenames=false
	for wav in $(find "$instrument" -type f -maxdepth 1 -iname '*.wav' | sort -V ); do
		hasValidFilenames=true
		#pattern: 104.g#7.wav, 60.c4.wav, 
		if ! [[ $wav =~ [0-9]+\.[a-zA-Z]{1}\#?[0-9]{1}\.wav$ ]]; then
			#echo "$wav has an invalid format"
			hasValidFilenames=false
		fi
	done


	if [ "$hasValidFilenames" = true ]; then
		wavTotalCount=0
		for wav in $(find "$instrument" -type f -maxdepth 1 -iname '*.wav' | sort -V ); do
			wavTotalCount=$(($wavTotalCount + 1))
		done
		wavCount=0
		for wav in $(find "$instrument" -type f -maxdepth 1 -iname '*.wav' | sort -V ); do
			wavCount=$(($wavCount + 1))
			name=$(basename "$wav")
			rangeTopNote=0
			fileName="$DELUGE_SAMPLES_ROOT/$instName/$name"
			transpose=0
			startSamplePos=0
			endSamplePos="$(soxi -s $wav)"

			midiNo="${name/.*/}"
			midiNo=$((midiNo + 0))
			rangeTopNote=$(($midiNo)) # omit if last
			transpose=$((60 - $midiNo)) # if 0 omit

			rangeTopNoteStr=$(cat <<EOF
rangeTopNote="$rangeTopNote"
EOF)
			if [[ $wavCount = $wavTotalCount ]]; then
				rangeTopNoteStr=""
			fi

			sampleRangesStr=$(cat <<EOF
$sampleRangesStr <sampleRange
	$rangeTopNoteStr
	fileName="$fileName"
	transpose="$transpose">
	<zone  startSamplePos="$startSamplePos" endSamplePos="$endSamplePos" />
</sampleRange>
EOF)

		done

		
		# apply params
		if [[ $instNameRaw =~ "b." ]]; then
			RELEASE_TIME="$RELEASE_TIME_BASS"
		elif [[ $instNameRaw =~ "bs." ]]; then
			RELEASE_TIME="$RELEASE_TIME_BASS_SHORT"
		elif [[ $instNameRaw =~ "l." ]]; then
			RELEASE_TIME="$RELEASE_TIME_LEAD"
		elif [[ $instNameRaw =~ "p." ]]; then
			RELEASE_TIME="$RELEASE_TIME_PAD"
		elif [[ $instNameRaw =~ "x." ]]; then
			RELEASE_TIME="$RELEASE_TIME_FX"
		fi	
		
		template=$(<template.XML)
		template="${template/__SAMPLE_RANGES__/$sampleRangesStr}"
		template="${template/__RELEASE_TIME__/$RELEASE_TIME}"
		
		delugePresetName="$DELUGE_PRESET_NAMESPACE.$instNameRaw.XML"
		printf "%s" "$template" > "$delugePresetName"
		echo "Created $delugePresetName for folder $instNameRaw" 
	else 
		echo "folder $instNameRaw: no XML generated, invalid files"
	fi
	
done

IFS="$OIFS"
