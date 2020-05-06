on run argv
	set audioName to item 1 of argv
	set filePath to (path to me as text) & "." & audioName & ".m4a"
	set placetosaveFile to a reference to file filePath
	tell application "QuickTime Player"
		stop the front document
		export (front document) in placetosaveFile using settings preset "Audio Only"
		close (front document) without saving
		delay 1
	end tell
end run 