#! /bin/sh

## 
## [PARAMS]
 # [1] = String; OUTPUT_PORT
 # [2] = Integer; NOTE_LENGTH; in seconds
 # [3] = Integer; SILENCE_INTERVAL; in seconds


OIFS="$IFS"
IFS=$'\n'

if ! [ -x "$(command -v sendmidi)" ]; then
		echo 'Error: Install sendmidi https://github.com/gbevin/SendMIDI'  
	  	exit 1
fi

NO_OF_NOTES=96
START_NOTE=24
NOTE_LENGTH=6
SILENCE_INTERVAL=4 
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
	SILENCE_INTERVAL="$2"
fi


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

sendmidi dev "$OUTPUT_PORT" panic
cnt=0
for ((i=START_NOTE; i<START_NOTE+NO_OF_NOTES;i++)); 
do 
   cnt=$((cnt + 1))	
   echo "${NOTES[$i]} ($cnt out of $NO_OF_NOTES)"
   sendmidi dev "$OUTPUT_PORT" on "$i" "$VELOCITY"
   sleep "$NOTE_LENGTH"
   sendmidi dev "$OUTPUT_PORT" off "$i" "$VELOCITY"
   sleep "$SILENCE_INTERVAL"
done






IFS="$OIFS"
exit 1