#! /bin/sh

## Create Deluge multisample XML preset file from folder of samples with named wavs
## Params
## 1 = Root folder where samples are stored on the SD Card

if ! [ -x "$(command -v soxi)" ]; then
		echo 'Error: soxi (sox.sourceforge.net) is not installed.'  
	  	exit 1
fi

if [ -z "$1" ]; then
	DELUGE_SAMPLES_ROOT="$1"  
else 
	DELUGE_SAMPLES_ROOT="SAMPLES/3thparty/amiga909.multisamples/zeeon-beepstreet"
fi


WORKING_DIR="./"
DELUGE_PRESET_NAMESPACE="a9"
RELEASE_TIME=5
BASS_RELEASE_TIME=3
BASS_SHORT_RELEASE_TIME=1
LEAD_RELEASE_TIME=10
PAD_RELEASE_TIME=20
FX_RELEASE_TIME=15

# map Deluge 0-50
paramVals=(0x80000000 0x851EB851 0x8A3D70A2 0x8F5C28F3 0x947AE144 0x99999995 0x9EB851E6 0xA3D70A37 0xA8F5C288 0xAE147AD9 0xB333332A 0xB851EB7B 0xBD70A3CC 0xC28F5C1D 0xC7AE146E 0xCCCCCCBF 0xD1EB8510 0xD70A3D61 0xDC28F5B2 0xE147AE03 0xE6666654 0xEB851EA5 0xF0A3D6F6 0xF5C28F47 0xFAE14798 0x00000000 0x051EB83A 0x0A3D708B 0x0F5C28DC 0x147AE12D 0x1999997E 0x1EB851CF 0x23D70A20 0x28F5C271 0x2E147AC2 0x33333313 0x3851EB64 0x3D70A3B5 0x428F5C06 0x47AE1457 0x4CCCCCA8 0x51EB84F9 0x570A3D4A 0x5C28F59B 0x6147ADEC 0x6666663D 0x6B851E8E 0x70A3D6DF 0x75C28F30 0x7AE14781 0x7FFFFFD2)

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
		reverbAmount="0x00000000"
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
			release="RELEASE_TIME" />
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
		# apply params
		if [[ $instNameRaw =~ ".b." ]]; then
			RELEASE_TIME="$BASS_RELEASE_TIME"
		elif [[ $instNameRaw =~ ".bs." ]]; then
			RELEASE_TIME="$BASS_SHORT_RELEASE_TIME"
		elif [[ $instNameRaw =~ ".l." ]]; then
			RELEASE_TIME="$LEAD_RELEASE_TIME"
		elif [[ $instNameRaw =~ ".p." ]]; then
			RELEASE_TIME="$PAD_RELEASE_TIME"
		elif [[ $instNameRaw =~ ".x." ]]; then
			RELEASE_TIME="$FX_RELEASE_TIME"
		fi	
		RELEASE_TIME="${paramVals[$RELEASE_TIME]}"
		templateLower="${templateLower/RELEASE_TIME/$RELEASE_TIME}"

		echo "$templateUpper $sampleRangesStr $templateLower" > "$DELUGE_PRESET_NAMESPACE.$instNameRaw.XML" 
	else 
		echo "folder $instNameRaw: no XML generated, invalid files"
	fi
	
	
done
