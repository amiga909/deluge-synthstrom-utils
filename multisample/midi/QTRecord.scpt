on run argv
set audioName to item 1 of argv
set delaySeconds to item 2 of argv
set filePath to (path to me as text) & "." & audioName & ".m4a"
set placetosaveFile to a reference to file filePath
tell application "QuickTime Player"
	set new_recording to (new audio recording)
	tell new_recording
		start
		delay delaySeconds
		stop
	end tell
	export (first document) in placetosaveFile using settings preset "Audio Only"
	close (first document) without saving
end tell
end run 