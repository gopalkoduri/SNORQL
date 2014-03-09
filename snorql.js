var endpointURL = 'http://devaraya.s.upf.edu/sparql';
var defaultGraphURI = 'http://dbpedia.org/resource/';
var namespaces = {
    'http://www.w3.org/2002/07/owl#': 'owl',
    'http://www.w3.org/2001/XMLSchema#': 'xsd',
    'http://www.w3.org/2000/01/rdf-schema#': 'rdfs',
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf',
    'http://xmlns.com/foaf/0.1/': 'foaf',
    'http://purl.org/dc/elements/1.1/': 'dc',
    'http://dbpedia.org/resource/': '',
    'http://dbpedia.org/property/': 'dbpedia2',
    'http://dbpedia.org/': 'dbpedia',
    'http://www.w3.org/2004/02/skos/core#': 'skos'
};
function toPrefixes(namespaces) {
    var result = '';
    for (var uri in namespaces) {
        result += 'PREFIX ' + namespaces[uri] + ': <' + uri + '>\n';
    }
    return result;
}
function betterUnescape(s) {
    return unescape(s.replace(/\+/g, ' '));
}
function start() {
    setEndpointURL(endpointURL, defaultGraphURI);
    setPrefixesText(toPrefixes(namespaces));
    outputChanged('browse');
    var match = document.location.href.match(/\?(.*)/);
    if (match) {
        var queryString = match[1];
    } else {
        var queryString = '';
    }
    if (!queryString) {
        document.getElementById('querytext').value = 'SELECT * WHERE {\n...\n}';
        return;
    }
    var querytext = null;
    if (queryString == 'classes') {
        var resultTitle = 'List of all classes:';
        var query = 'SELECT DISTINCT ?class\n' +
                'WHERE { [] a ?class }\n' +
                'ORDER BY ?class';
    }
    if (queryString == 'properties') {
        var resultTitle = 'List of all properties:';
        var query = 'SELECT DISTINCT ?property\n' +
                'WHERE { [] ?property [] }\n' +
                'ORDER BY ?property';
    }
    var match = queryString.match(/property=([^&]*)/);
    if (match) {
        var resultTitle = 'All uses of property ' + betterUnescape(match[1]) + ':';
        var query = 'SELECT ?resource ?value\n' +
                'WHERE { ?resource <' + betterUnescape(match[1]) + '> ?value }\n' +
                'ORDER BY ?resource ?value';
    }
    var match = queryString.match(/class=([^&]*)/);
    if (match) {
        var resultTitle = 'All instances of class ' + betterUnescape(match[1]) + ':';
        var query = 'SELECT ?instance\n' +
                'WHERE { ?instance a <' + betterUnescape(match[1]) + '> }\n' +
                'ORDER BY ?instance';
    }
    var match = queryString.match(/describe=([^&]*)/);
    if (match) {
        var resultTitle = 'Description of ' + betterUnescape(match[1]) + ':';
        var query = 'SELECT ?property ?hasValue ?isValueOf\n' +
                'WHERE {\n' +
                '  { <' + betterUnescape(match[1]) + '> ?property ?hasValue }\n' +
                '  UNION\n' +
                '  { ?isValueOf ?property <' + betterUnescape(match[1]) + '> }\n' +
                '}';
//                '}\n' +
//                'ORDER BY ?isValueOf ?hasValue ?property';
    }
    if (queryString.match(/query=/)) {
        var resultTitle = 'SPARQL results:';
        querytext = betterUnescape(queryString.match(/query=([^&]*)/)[1]);
        var query = toPrefixes(namespaces) + querytext;
    }
    if (!querytext) {
        querytext = query;
    }
    document.getElementById('querytext').value = querytext;
    doQuery(query, function(json) { displayResult(json, resultTitle); });
}
var service;
function setEndpointURL(url, defaultGraphURI) {
    document.title = document.title + ' for ' + url;
    document.getElementById('title').appendChild(document.createTextNode(' for ' + url));
    document.getElementById('queryform').action = url;
    document.getElementById('defaultgraph').value = defaultGraphURI;
    service = new SPARQL.Service(url);
    service.setMethod('GET');
    if (defaultGraphURI) {
        service.addDefaultGraph(defaultGraphURI);
    }
}
function setPrefixesText(prefixes) {
    document.getElementById('prefixestext').appendChild(
            document.createTextNode(prefixes));
}
function doQuery(sparql, callback) {
    busy = document.createElement('p');
    busy.className = 'busy';
    busy.appendChild(document.createTextNode('Executing query ...'));
    setResult(busy);
    service.query(sparql, {
            success: callback,
            failure: onFailure
    });
}
function displayResult(json, resultTitle) {
    var div = document.createElement('div');
    var title = document.createElement('h2');
    title.appendChild(document.createTextNode(resultTitle));
    div.appendChild(title);
    if (json.results.bindings.length == 0) {
        var p = document.createElement('p');
        p.className = 'empty';
        p.appendChild(document.createTextNode('[no results]'));
        div.appendChild(p);
    } else {
        div.appendChild(jsonToHTML(json));
    }
    setResult(div);
}
var xsltInput = null;
function outputChanged(newValue) {
    if (xsltInput == null) {
        xsltInput = document.getElementById('xsltinput');
    }
    var el = document.getElementById('xsltcontainer');
    while (el.childNodes.length > 0) {
        el.removeChild(el.firstChild);
    }
    if (newValue == 'xslt') {
        el.appendChild(xsltInput);
    }
}
function browserBaseURL() {
    return document.location.href.replace(/\?.*/, '');
}
function submitQuery() {
    var output = document.getElementById('selectoutput').value;
    if (output == 'browse') {
        document.getElementById('queryform').action = browserBaseURL();
        document.getElementById('query').value = document.getElementById('querytext').value;
    } else {
        document.getElementById('query').value = toPrefixes(namespaces) + document.getElementById('querytext').value;
    }
    document.getElementById('defaultgraph').disabled = (output == 'browse');
    document.getElementById('jsonoutput').disabled = (output != 'json');
    document.getElementById('stylesheet').disabled = (output != 'xslt' || !document.getElementById('xsltstylesheet').value);
    if (output == 'xslt') {
        document.getElementById('stylesheet').value = document.getElementById('xsltstylesheet').value;
    }
    document.getElementById('queryform').submit();
}
function resetQuery() {
    document.location = browserBaseURL();
}
function onFailure(report) {
    var message = report.responseText.match(/<pre>([\s\S]*)<\/pre>/);
    if (message) {
        var pre = document.createElement('pre');
        pre.innerHTML = message[1];
        setResult(pre);
    } else {
        var div = document.createElement('div');
        div.innerHTML = report.responseText;
        setResult(div);
    }
}
function setResult(node) {
    display(node, 'result');
}
function display(node, whereID) {
    var where = document.getElementById(whereID);
    if (!where) {
        alert('ID not found: ' + whereID);
        return;
    }
    while (where.firstChild) {
        where.removeChild(where.firstChild);
    }
    if (node == null) return;
    where.appendChild(node);
}
function jsonToHTML(json) {
    var table = document.createElement('table');
    table.className = 'queryresults';
    var tr = document.createElement('tr');
    for (var i in json.head.vars) {
        var th = document.createElement('th');
        th.appendChild(document.createTextNode(json.head.vars[i]));
        tr.appendChild(th);
    }
    table.appendChild(tr);
    for (var i in json.results.bindings) {
        var binding = json.results.bindings[i];
        var tr = document.createElement('tr');
        if (i % 2) {
            tr.className = 'odd';
        } else {
            tr.className = 'even';
        }
        for (var v in json.head.vars) {
            td = document.createElement('td');
            var varName = json.head.vars[v];
            var node = binding[varName];
            if (varName == 'property') {
                td.appendChild(nodeToHTML(node, function(uri) { return '?property=' + escape(uri); }));
            } else if (varName == 'class') {
                td.appendChild(nodeToHTML(node, function(uri) { return '?class=' + escape(uri); }));
            } else {
                td.appendChild(nodeToHTML(node, function(uri) { return '?describe=' + escape(uri); }));
            }
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    return table;
}
function toQName(uri) {
    for (nsURI in namespaces) {
        if (uri.indexOf(nsURI) == 0) {
            return namespaces[nsURI] + ':' + uri.substring(nsURI.length);
        }
    }
    return null;
}
function toQNameOrURI(uri) {
    for (nsURI in namespaces) {
        if (uri.indexOf(nsURI) == 0) {
            return namespaces[nsURI] + ':' + uri.substring(nsURI.length);
        }
    }
    return '<' + uri + '>';
}
var xsdNamespace = 'http://www.w3.org/2001/XMLSchema#';
var numericXSDTypes = ['long', 'decimal', 'float', 'double', 'int', 'short', 'byte', 'integer',
        'nonPositiveInteger', 'negativeInteger', 'nonNegativeInteger', 'positiveInteger',
        'unsignedLong', 'unsignedInt', 'unsignedShort', 'unsignedByte'];
for (i in numericXSDTypes) {
    numericXSDTypes[i] =  xsdNamespace + numericXSDTypes[i];
}
function nodeToHTML(node, linkMaker) {
    if (!node) {
        var span = document.createElement('span');
        span.className = 'unbound';
        span.title = 'Unbound'
        span.appendChild(document.createTextNode('-'));
        return span;
    }
    if (node.type == 'uri') {
        var span = document.createElement('span');
        span.className = 'uri';
        var qname = toQName(node.value);
        var a = document.createElement('a');
        a.href = linkMaker(node.value);
        a.title = '<' + node.value + '>';
        if (qname) {
            a.appendChild(document.createTextNode(qname));
            span.appendChild(a);
        } else {
            a.appendChild(document.createTextNode(node.value));
            span.appendChild(document.createTextNode('<'));
            span.appendChild(a);
            span.appendChild(document.createTextNode('>'));
        }
        match = node.value.match(/^(https?|ftp|mailto|irc|gopher|news):/);
        if (match) {
            span.appendChild(document.createTextNode(' '));
            var externalLink = document.createElement('a');
            externalLink.href = node.value;
            img = document.createElement('img');
            img.src = 'link.png';
            img.alt = '[' + match[1] + ']';
            img.title = 'Go to Web page';
            externalLink.appendChild(img);
            span.appendChild(externalLink);
        }
        return span;
    }
    if (node.type == 'bnode') {
        return document.createTextNode('_:' + node.value);
    }
    if (node.type == 'literal') {
        var text = '"' + node.value + '"';
        if (node['xml:lang']) {
            text += '@' + node['xml:lang'];
        }
        return document.createTextNode(text);
    }
    if (node.type == 'typed-literal') {
        var text = '"' + node.value + '"';
        if (node.datatype) {
            text += '^^' + toQNameOrURI(node.datatype);
        }
        for (i in numericXSDTypes) {
            if (numericXSDTypes[i] == node.datatype) {
                var span = document.createElement('span');
                span.title = text;
                span.appendChild(document.createTextNode(node.value));
                return span;
            }
        }
        return document.createTextNode(text);
    }
    return document.createTextNode('???');
}
function addEvent(obj, evType, fn){
    if (obj.addEventListener){
        obj.addEventListener(evType, fn, true);
        return true;
    } else if (obj.attachEvent){
        var r = obj.attachEvent("on"+evType, fn);
        return r;
    } else {
        alert("Handler could not be attached");
    }
}
