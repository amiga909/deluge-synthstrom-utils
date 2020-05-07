testnotes=( 12 24 96 127)


for note in "${testnotes[@]}"; do
	echo "$note"
	sendmidi dev "VMPK Input" on $note 100
	sleep 2
	sendmidi dev "VMPK Input" off $note 100
done	

