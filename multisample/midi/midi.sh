#! /bin/sh

## 
## [PARAMS]
 # [1] = String; OUTPUT_PORT;
 # [2] = Integer; NOTE_LENGTH; in seconds; default=6
 # [3] = Integer; SILENCE_INTERVAL; in seconds; default=4
 # [4] = Integer; NO_OF_NOTES; default=96
 # [5] = Integer; START_NOTE; default=24

OIFS="$IFS"
IFS=$'\n'

if ! [ -x "$(command -v sendmidi)" ]; then
		echo 'Error: Install sendmidi https://github.com/gbevin/SendMIDI'  
	  	exit 1
fi

if ! [ -x "$(command -v ffmpeg)" ]; then
		echo 'Error: Install ffmpeg'  
	  	exit 1
fi
if ! [ -x "$(command -v sox)" ]; then
		echo 'Error: Install sox'  
	  	exit 1
fi

RECORDINGS_FOLDER="./recordings"
mkdir -p $RECORDINGS_FOLDER
NO_OF_NOTES=96
START_NOTE=12
NOTE_LENGTH=8
SILENCE_INTERVAL=5 
VELOCITY=100

OUTPUT_PORT=""
if [ -z "$1" ]; then
	echo "Choose Output Port from 'sendmidi list'"
	echo $(sendmidi list)
fi
OUTPUT_PORT="$1"  

if [ ! -z "$2" ]; then
	NOTE_LENGTH="$2"
fi
if [ ! -z "$3" ]; then
	SILENCE_INTERVAL="$3"
fi
if [ ! -z "$4" ]; then
	NO_OF_NOTES="$4"
fi
if [ ! -z "$5" ]; then
	START_NOTE="$5"
fi

NOTES=( )
function note_table () {
   	octave=( c c# d d# e f f# g g# a a# h )
	count=0
	for count in {0..10}; do
		for i in "${octave[@]}"; do
			displOct=$((count-1))
			NOTES+=("$i$displOct")
		done
	done
}
note_table

sendmidi dev "$OUTPUT_PORT" panic

presetCnt=8
#amoeba: distort percvib tranperc rotperc darc spooky
#anamark ( basedrum deepbasedrum highbass heavyattack pseudodelaybass electricbass modulatedbass crazybass )
presetNames=( lightdirtybass electricattackbass quasisquarebass synpad rezzvoice quintpadorsitar easternlead bassandbase overdrive )

segment=$((NOTE_LENGTH + SILENCE_INTERVAL))
totalDuration=$(( NO_OF_NOTES * segment ))
totalDuration=$(( ${#presetNames[@] - presetCnt} * totalDuration ))
printf 'totalDuration %dh:%dm:%ds\n' $(($totalDuration/3600)) $(($totalDuration%3600/60)) $(($totalDuration%60))

for presetName in "${presetNames[@]}"; do
	echo "----------------------------------"
	echo "Init recording: $presetName"
	ffmpgPID="$(ps | grep -v grep | grep ffmpeg | awk '{print $1}')"
	if [[ $ffmpgPID -gt 0 ]]; then
		kill  $ffmpgPID
		echo "Error: ffmpeg was still running"
		exit 	
	fi
	osascript  -e 'tell application "VFX.VstLoaderWine" to activate'
	echo "waiting 5s to open VFX"
	sleep 5
	sendmidi dev "$OUTPUT_PORT" pc "$presetCnt"
	echo "waiting 2s to change Midi PC"
	sleep 2
	# -y: force overwrite
	ffmpeg -f avfoundation -y -i ":0" "$RECORDINGS_FOLDER/$presetName".wav &
	echo "waiting 2s to init audio recording"
	sleep 2
	presetCnt=$((presetCnt + 1))	
	cnt=0
	for ((i=START_NOTE; i<START_NOTE+NO_OF_NOTES;i++)); 
	do 
	   cnt=$((cnt + 1))	
	   echo "${NOTES[$i]} ($cnt out of $NO_OF_NOTES)"
	   sendmidi dev "$OUTPUT_PORT" on "$i" "$VELOCITY"
	   sleep "$NOTE_LENGTH"
	   # noteOff velocity = 64: http://midi.teragonaudio.com/tech/midispec/noteoff.htm
	   sendmidi dev "$OUTPUT_PORT" off "$i" 64
	   sleep "$SILENCE_INTERVAL"
	done

	sleep 1 
	osascript  -e 'tell application "VFX.VstLoaderWine" to quit'
	ffmpgPID="$(ps | grep -v grep | grep ffmpeg | awk '{print $1}')"
	if [[ $ffmpgPID -gt 0 ]]; then
		kill  $ffmpgPID
	else 
		echo "Error: something wrent wrong recording $presetName"
		exit
	fi

	echo "Wait 5s for shutting down VFX and ffmpeg"
	sleep 5

	if ls $RECORDINGS_FOLDER/*$presetName*.wav 1> /dev/null 2>&1; then
    	echo "Done recording $presetName.wav"
	else
	    echo "Error: Recording for $presetName does not exist"
	    exit
	fi
	sox "$RECORDINGS_FOLDER/$presetName.wav" --norm="-1" "$RECORDINGS_FOLDER/$presetName-normalized.wav" ;
done



IFS="$OIFS"
exit 1

#https://github.com/madskjeldgaard/sox-tricks/blob/master/.sox_tricks