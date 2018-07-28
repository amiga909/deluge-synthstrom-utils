exports.syntaxHighlight = function syntaxHighlight(obj) {
    let json = JSON.stringify(obj, undefined, 4)

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    json =  json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
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
        return '<span class="' + cls + '">' + match + '</span>';
    });
    return "<pre>" + json + "</pre>";
}


exports.onlyUnique = function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

exports.toJson = function toJson(xml) {
    // cannot parse xml version statement :p
    xml = xml.replace(/<\?xml .*\?>/, '');
    // one root tag allowed, use wrapper
    var json = x2js.xml2js('<wrap>' + xml + '</wrap>').wrap;

    return json;
}


exports.toXml = function toXml(json) {
    json = JSON.parse(json);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + json2xml(json, "\t");
}