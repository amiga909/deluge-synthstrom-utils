
class RecordingCleaner
	#!/usr/bin/env ruby

	require 'fileutils'



	@@usedRecs = []
	@@unusedRecs = []
	@@recs = []

	def initialize(isDry)
		args = ARGV.join(" ")
		@isDryRun = args.match("dry") != nil ? true : false 	
		@isEnableDebug = args.match("debug") != nil || false 
		@includeRecord = args.match("exclude-record") != nil ? false : true 
		@includeResample = args.match("exclude-resample") != nil ? false : true
		@includeUserSamples = args.match("include-user") != nil ? true : false


		class << self
			attr_accessor :isDryRun
		end 	

	end

	
	def getFiles

		Dir[ "./SAMPLES/RECORD/*.{WAV,wav}"].each do |f|
						@@recs.push(f.sub('./SAMPLES', 'SAMPLES')) unless File.directory? f
		end
		Dir[ "./SAMPLES/RESAMPLE/*.{WAV,wav}"].each do |f|

			@@recs.push(f.sub('./SAMPLES', 'SAMPLES')) unless File.directory? f
		end
				Dir[ "./*/*.{XML,xml}"].each do |f|
			parseFile(f) unless File.directory? f
		end
				@@usedRecs.uniq!
		@@recs.uniq!
		@@unusedRecs = @@recs -  @@usedRecs
			end

	def display
		p "To Archive: #{@@unusedRecs }"
		p %{ recs: #{@@recs.size} | 
usedRecs: #{@@usedRecs.size} |
unusedRecs: #{@@unusedRecs.size}
 	}.gsub(/\s+/, " ").strip
			end 

	def archive 
		cnt = 0
		@@unusedRecs.each do |f|
			f = './'+f
			if File.exist?(f)
				 dir = File.dirname(f)
				 FileUtils::mkdir_p './_ARCHIVED/' + dir
				 cnt = cnt + 1
				 FileUtils.mv(f, './_ARCHIVED/' + dir) 
			end 	
		end 
		p "Done. Archived #{cnt} Files."
	end	

	def parseFile path
		File.foreach(path) do |f|
			if ! f.valid_encoding?
			  s = f.encode("UTF-16be", :invalid=>:replace, :replace=>"?").encode('UTF-8')
			  s.gsub(/dr/i,'med')
			  f = s
			end
			match = f.match(/(SAMPLES\/RECORD\/REC[0-9]+\.WAV)/)
			@@usedRecs.push(match[0]) if match
						match = f.match(/(SAMPLES\/RESAMPLE\/REC[0-9]+\.WAV)/)
			@@usedRecs.push(match[0]) if match
		end

	end

end
c = RecordingCleaner.new(true)

p c 


if c.isDryRun()
	c.getFiles()
	c.display()
	else 
	c.getFiles()
	c.display()
	c.archive() 
end



