const fs = require('fs');
const shell = require('shelljs');
var x2jsLib = require('x2js');

let x2js = new x2jsLib()
console.log(x2js)

if (!shell.which('afinfo')) {
    shell.echo('Sorry, this function requires afinfo');
    shell.exit(1);
}

let root = '../SONGS/';

shell.cd(root);

files = fs.readdirSync(__dirname + '/' + root);
let songSamples = shell.find('.').filter(function(file) {
    
    if (file.match(/\.XML$/) != null) {
        data = String(shell.cat(file))

        let json = toJson(data)
        console.log(json)

        return false;
        let samples = shell.grep("<fileName>.*</fileName>", file)
        //console.log(samples)
        return file
    }
});



function toJson(xml) {
    // cannot parse xml version statement :p
    xml = xml.replace(/<\?xml .*\?>/, '');

    // one root tag allowed, use wrapper
    var json = x2js.xml2js('<wrap>' + xml + '</wrap>').wrap;

    return json;
}

//console.log(songSamples); 


/*

if (!shell.test('-f', path)) continue; // skip if it's a regular file

*/