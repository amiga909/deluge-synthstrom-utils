#! /bin/sh

## Create Deluge multisample XML preset file from folder of samples with named wavs
## 
##

if ! [ -x "$(command -v soxi)" ]; then
		echo 'Error: soxi (sox.sourceforge.net) is not installed.'  
	  	exit 1
fi


WORKING_DIR="./"
DELUGE_SAMPLES_ROOT="SAMPLES/amiga909.multisamples/zeeon-beepstreet"
octave=( c c# d d# e f f# g g# a a# h )

templateUpper=$(cat <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<sound
	firmwareVersion="3.0.3"
	earliestCompatibleFirmware="3.0.0"
	polyphonic="poly"
	voicePriority="1"
	mode="subtractive"
	lpfMode="12dB"
	modFXType="none">
	<osc1
		type="sample"
		loopMode="0"
		reversed="0"
		timeStretchEnable="0"
		timeStretchAmount="0">
		<sampleRanges>
EOF)
templateLower=$(cat <<EOF
</sampleRanges>
	</osc1>
	<osc2
		type="square"
		transpose="0"
		cents="0"
		retrigPhase="-1" />
	<lfo1 type="triangle" syncLevel="0" />
	<lfo2 type="triangle" />
	<unison num="1" detune="1" />
	<compressor
		syncLevel="6"
		attack="327244"
		release="936" />
	<delay
		pingPong="1"
		analog="0"
		syncLevel="7" />
	<defaultParams
		arpeggiatorGate="0x00000000"
		portamento="0x80000000"
		compressorShape="0xDC28F5B2"
		oscAVolume="0x7FFFFFFF"
		oscAPulseWidth="0x00000000"
		oscBVolume="0x80000000"
		oscBPulseWidth="0x00000000"
		noiseVolume="0x80000000"
		volume="0xFE000000"
		pan="0x00000000"
		lpfFrequency="0x7FFFFFD2"
		lpfResonance="0x80000000"
		hpfFrequency="0x80000000"
		hpfResonance="0x80000000"
		lfo1Rate="0x26000000"
		lfo2Rate="0x00000000"
		modulator1Amount="0x80000000"
		modulator1Feedback="0x80000000"
		modulator2Amount="0x80000000"
		modulator2Feedback="0x80000000"
		carrier1Feedback="0x80000000"
		carrier2Feedback="0x80000000"
		modFXRate="0xC7AE146E"
		modFXDepth="0xAE147AD9"
		delayRate="0xF0000000"
		delayFeedback="0x80000000"
		reverbAmount="0x0E000000"
		arpeggiatorRate="0x00000000"
		stutterRate="0x00000000"
		sampleRateReduction="0x80000000"
		bitCrush="0x80000000"
		modFXOffset="0x00000000"
		modFXFeedback="0x1EB851CF">
		<envelope1
			attack="0x80000000"
			decay="0xE6666654"
			sustain="0x7FFFFFFF"
			release="0x8C000000" />
		<envelope2
			attack="0xE6666654"
			decay="0xE6666654"
			sustain="0xFFFFFFE9"
			release="0xE6666654" />
		<patchCables>
			<patchCable
				source="velocity"
				destination="volume"
				amount="0x3FFFFFE8" />
			<patchCable
				source="random"
				destination="pitch"
				amount="0x0147AE14" />
		</patchCables>
		<equalizer
			bass="0x00000000"
			treble="0x00000000"
			bassFrequency="0x00000000"
			trebleFrequency="0x00000000" />
	</defaultParams>
	<arpeggiator
		mode="off"
		numOctaves="2"
		syncLevel="7" />
	<modKnobs>
		<modKnob controlsParam="pan" />
		<modKnob controlsParam="volumePostFX" />
		<modKnob controlsParam="lpfResonance" />
		<modKnob controlsParam="lpfFrequency" />
		<modKnob controlsParam="env1Release" />
		<modKnob controlsParam="env1Attack" />
		<modKnob controlsParam="delayFeedback" />
		<modKnob controlsParam="delayRate" />
		<modKnob controlsParam="reverbAmount" />
		<modKnob controlsParam="volumePostReverbSend" patchAmountFromSource="compressor" />
		<modKnob controlsParam="pitch" patchAmountFromSource="lfo1" />
		<modKnob controlsParam="lfo1Rate" />
		<modKnob controlsParam="portamento" />
		<modKnob controlsParam="stutterRate" />
		<modKnob controlsParam="bitcrushAmount" />
		<modKnob controlsParam="sampleRateReduction" />
	</modKnobs>
</sound>

EOF)
 
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
		for wav in $(find "$instrument" -type f -maxdepth 1 -iname '*.wav' | sort -V ); do
			name=$(basename "$wav")
			rangeTopNote=0
			fileName="$DELUGE_SAMPLES_ROOT/$instName/$name"
			transpose=0
			startSamplePos=0
			endSamplePos="$(soxi -s $wav)"

			midiNo="${name/.*/}"
			midiNo=$((midiNo + 0))

			rangeTopNote=$(($midiNo + 12)) # omit if last
			transpose=$((48 - $midiNo)) # if 0 omit

			sampleRangesStr=$(cat <<EOF
$sampleRangesStr <sampleRange
	rangeTopNote="$rangeTopNote"
	fileName="$fileName"
	transpose="$transpose">
	<zone  startSamplePos="$startSamplePos" endSamplePos="$endSamplePos" />
</sampleRange>
EOF)
		done
		echo "$templateUpper $sampleRangesStr $templateLower" > "a9.$instNameRaw.XML" 
		echo "$instNameRaw: a909.$instNameRaw.XML created"
	else 
		echo "-- $instNameRaw: no XML generated, invalid filenames."
	fi
	
	
done



#(note rangeTop transpose (no))
#samplerobot
#c0   24 36  (12)
#c1   37 24  (24)
#d#1  40 21  (27)
#c2   49 12  (36)
#a2   58 3   (45)
#c3   61 NONE (48)
#d#3  64 -3  (51)
#f#3  67 -6  (54)
#a5   94 -33 (81)
#c6   L  -36 (84)