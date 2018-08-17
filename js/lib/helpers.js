const x2jsLib = require('x2js')
const x2js = new x2jsLib()

exports.syntaxHighlight = function syntaxHighlight(obj) {
    let json = JSON.stringify(obj, undefined, 4)

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    json = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }

        if (String(match) == '"notFound":' || String(match) == '"ambiguous":') {
            cls = 'error'
        } else if (String(match) == '"fixed":') {
            cls = 'success'
        } else if (String(match) == '"skipped":') {
            cls = 'error'
        }

        return '<span class="' + cls + '">' + match + '</span>';
    });
    return "<pre>" + json + "</pre>";
}




exports.onlyUnique = function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

exports.toJson = function toJson(xml) {
    // cannot parse xml version statement :p
    xml = xml.replace(/<\?xml .*\?>/, '')
    // one root tag allowed, use wrapper
    let json = x2js.xml2js('<wrap>' + xml + '</wrap>').wrap

    return json
}


exports.toXml = function toXml(json) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + formatXml(x2js.js2xml(json));
}

exports.intersect = function intersect(a, b) {
    return [...new Set(a)].filter(x => new Set(b).has(x));
}

exports.getAllCasePermutations = function getAllCasePermutations(str) {
    let results = [];
    let arr = str.split("");
    let len = Math.pow(arr.length, 2);

    for (let i = 0; i < len; i++) {
        for (let k = 0, j = i; k < arr.length; k++, j >>= 1) {
            arr[k] = (j & 1) ? arr[k].toUpperCase() : arr[k].toLowerCase();
        }
        let combo = arr.join("");
        results.push(combo);
    }
    return results;
}


function formatXml(xml) {
    var formatted = '';
    var reg = /(>)(<)(\/*)/g;
    xml = xml.replace(reg, '$1\r\n$2$3');
    var pad = 0;
    jQuery.each(xml.split('\r\n'), function(index, node) {
        var indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
            indent = 0;
        } else if (node.match(/^<\/\w/)) {
            if (pad != 0) {
                pad -= 1;
            }
        } else if (node.match(/^<\w([^>]*[^\/])?>.*$/)) {
            indent = 1;
        } else {
            indent = 0;
        }

        var padding = '';
        for (var i = 0; i < pad; i++) {
            padding += '  ';
        }

        formatted += padding + node + '\r\n';
        pad += indent;
    });

    return formatted;
}