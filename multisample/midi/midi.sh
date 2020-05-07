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

NO_OF_NOTES=96
START_NOTE=12
NOTE_LENGTH=6
SILENCE_INTERVAL=5 
VELOCITY=100

OUTPUT_PORT=""
if [ -z "$1" ]; then
	echo "Choose Output Port from 'sendmidi list'"
	echo $(sendmidi list)
	exit 1
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
note_length=$((NOTE_LENGTH + SILENCE_INTERVAL))
TOTAL_LENGTH=$(( NO_OF_NOTES * note_length ))
TOTAL_LENGTH=$((TOTAL_LENGTH + 3))
echo "TOTAL_LENGTH: $TOTAL_LENGTH"

NOTES=( )
function note_table () {
	#deluge note names
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
#osascript -e 'tell application "QuickTime Player"' -e 'tell application "QuickTime Player" to start (new audio recording)'

sendmidi dev "$OUTPUT_PORT" panic

presetCnt=8
#amoeba: distort percvib tranperc rotperc darc spooky
#anamark ( basedrum deepbasedrum highbass heavyattack pseudodelaybass electricbass modulatedbass crazybass )
presetNames=( lightdirtybass electricattackbass quasisquarebass synpad rezzvoice quintpadorsitar easternlead bassandbase overdrive )
for presetName in "${presetNames[@]}"; do
	echo "----------------------------------"
	echo "Init recording: $presetName"
	osascript  -e 'tell application "QuickTime Player" to activate'
	osascript  -e 'tell application "VFX.VstLoaderWine" to activate'
	echo "waiting 10s to open VFX and QT"
	sleep 10
	sendmidi dev "$OUTPUT_PORT" pc "$presetCnt"
	osascript  -e 'tell application "QuickTime Player" to start (new audio recording)'
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

	#osascript  -e 'tell application "QuickTime Player" to stop the front document'	

	sleep 1 
	osascript  -e 'tell application "VFX.VstLoaderWine" to quit'
	osascript QTSaveRecord.scpt "$presetName"
	echo "Wait 30s for QT to export"
	sleep 30
	osascript  -e 'tell application "QuickTime Player" to quit without saving'
	echo "Done. Wait 10s for shutting down VFX and QT"
	sleep 10
	#if ls *$presetName*.m4a 1> /dev/null 2>&1; then
    #	echo "Recording done"
	#else
	#    echo "Error: Recording for $presetName does not exist"
	#fi
done



IFS="$OIFS"
exit 1