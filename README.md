
------------------------------------------------
Synthstrom Deluge maintenance utils
------------------------------------------------


------------------------------------------------
samplefixer.sh
------------------------------------------------

<< Want a tidy sample library? >>
-> Place this script in the root directory of the SD Card. 
-> Consider a backup before running any write commands. 

Analyze all data: 
'sh samplefixer.sh convert_clean'

Fix all data: 
'sh samplefixer.sh convert_clean_write'
 
Default path is the Deluge SAMPLES folder. 
You may pass a directory as an optional parameter. 
Pass it as relative path, e.g. 'RESAMPLE/', to narrow the search space. 

<convert [PATH]>
-> Analyze WAV files: Get all samples below 44kHz. Or having other oddities.

<clean [PATH]>
-> List non audio files and WAV samples Synthstrom Deluge might not be able to load.

<convert_write [PATH]>
-> Analyze WAV files: Get all samples below 44kHz. Or having other oddities.
-> Convert samples to 44kHz/16bit. No backup! Attention, disk usage might increase a lot. 

<clean_write [PATH]>
-> Deletes non audio files and WAV samples Synthstrom Deluge might not be able to load. No backup!


------------------------------------------------
archive_unused_recordings.rb
------------------------------------------------

Script to remove unused samples on the Deluge SD Card
currently only removes recordings
'ruby archive_unused_recordings.rb'
- recommended: create a backup of the SD Card first
- place this script in the root dir of the SD card
- all delete candidates are moved to the folder '_ARCHIVED', paths are preserved 




