const readline = require("readline");
const fileSystem = require("fs");

let rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

let filePath = "";

if (process.argv.length < 3) {
	console.log("Oops! No target specified!");
	rl.question("Please provide a path to your .narra file ", (answer) => {
		console.log(answer);
		filePath = answer;
		rl.close;
	})
}
else { 
	filePath = process.argv[2];
	console.log(filePath);
	rl.close;
}

let output = {
	scriptNum: 0,
	sceneNum: 0,
	elementNum: 0,
	frame: {
		scripts: {},
		scenes: {},
		elements: {},
		data: {}
	},
}

//been doing this wrong. Start with breaking file into lines and saving in array
//go through line by line, PARSING and SAVING elements as you go
//use CONTEXT to predict what should come next. Throw error for unexpected
//errors should be reported with line and position numbers of .narra file


output.parser = {
	context: [], //push or pop strings from array to indicate nested contexts...

}


output.parseNarra = function (narra) {
	let source = narra.match(/[\s\S]*?(\r\n|\r|\n)/g);
	//start with no context. Without context, there are only 3 valid things to find:
	// *[ indicates beginning of "base tag" content
	// <! indicates start of "comment" context
	// \r\n indicates end of line

	// inside comment context, all characters are valid (including newlines). 
	// !> signifies end of comment and returns to previous context

	// newline just jumps us to the next line

	// Inside base tag, (if previous context was null) we look for:
	// an element keyword: meta, init, or scene
	// a scene element keyword can optionally be followed by a string beginning with '#' which indicates the tag name
	// exit base tag context with ] and enter meta, init, or scene context

	// for "meta" context, expect to see a { which causes you to enter "meta-content" context. 
	// inside meta-content, look for key ("[a-zA-Z-0-9-_]") followed by a colon ([\s]*:) and a value ([\s]*[string or number][\s]*)
	// if followed by a , and anything but [\s]*\} look for key value pair again
	// if [\s]*,[\s]*\} exit to no context

	// for "init" context, expect [\s]*\{[\s\S]*?\}(?=[\s]\*\[)
	// Later on, copy javascript parser logic to deal with what's between the curly brackets
	// after } exit to no context

	// for scene context, expect to see *[ which opens base tag context inside scene context
	// inside this context, look for either:
	// a tag name reference (a string of any length with no space characters) relating to a previously named tag
	// or an element keyword: scene, script, text, or choice
	// an element keyword can optionally be followed by a string beginning with '#' which indicates the tag name
	// exit base tag context with ]

	// if base tag contained a tag name reference, enter previous context
	// else enter context of keyword

	// for script context, get everything inside the curly brackets and exit to no context until [\s]*\*\[

	// for text context expect any amount of text/whitespace, but look out for <* to enter inline-script context
	// for inline script context, expect a variable name or expression... *> exits this context and returns to text
	// [ enters action context. expect a keyword or script reference here followed by ] to exit context
	// exit back to scene context on *[

	// for choice context, expect to see \[option[\s]([a-zA-Z0-9-_])\][\s]*[\s\S]*(?=[option]) repeated any number of times
	// exit to scene context on *[

	//\*\[scene[\s]*#[a-zA-Z0-9-_]\] starts a new scene

	//\*\[end\] exits to no context






	// let scenes = narra.match(/(\*\[scene[\s\S]*?)(?=\*\[(scene|end))/gi);
	// this.parseScenes(scenes);
	// this.frame.meta = this.getMeta(narra);
	//this.getScripts(narra);
	// this.frame.scripts.init = this.getInit(narra);
	// console.log(this.frame);
}

output.scanner = {
	curLine: 0,
	curPos: 0,
	readNext: function(source) {
		this.curPos++;
		if (this.curPos >= source[this.curLine].length) {
			this.curLine++;
			this.curPos = 0;
		}
		if (this.curLine >= source.length) { return null; }
		else {
			return this.readChar(source, this.curLine, this.curPos);
		}
	},
	readChar: function(source, line, pos) {
		let character = {
			line: line,
			position: pos,
			char: source[line][pos],
			source: source
		};
		return character;
	}
}

output.lexer = {
	tokens: [],
	error: false,
	throwError: function (char, token) {
		this.error = true;
		let line = char.line;
		let pos = char.pos;
		if (token && (token.line || token.pos)) {
			line = token.line;
			pos = token.pos;
		}
		let errString = char.source[line].slice(pos);
		let unexpected =  errString.match(/[\S]*(?=[\s])/);
		console.log("Unexpected token " + unexpected + " at (" + line + ", " + pos + ")");
	},
	whiteSpace: function (char) {
		if (char.char.match(/[\s]/)) { return true; }
		return false;
	},
	blankToken: function (source, context) {
		return {
			content: "",
			type: (context) ? context : "",
			line: 0,
			pos: 0,
			source: source
		}
	},
	startToken: function (char, context) {
		return {
			content: char.char,
			type: context,
			line: char.line,
			pos: char.pos,
			source: char.source,
		};
	},
	addCharToToken: function (char, token) {
		return {
			content: token.content + char.char,
			type: token.type,
			line: (token.content) ? token.line : char.line,
			pos: (token.content) ? token.pos : char.pos,
			source: token.source
		}
	},
	saveToken: function (token, newContext, char) {
		if (char) { token.content += char.char; }
		this.tokens.push(token);
		return this.blankToken(token.source, newContext);
	},
	getTokens: function (source) {
		let currChar = output.scanner.readChar(source, 0, 0);
		let currToken = this.blankToken(source);
		while (currChar && !this.error) {
			//Starting context (ie not in a comment or base element)
			if (!currToken.type) {
				if (currChar.char == "*") { currToken = startToken(currChar, "startBaseTag"); }
				else if (currChar.char == "<") { currToken = startToken(currChar, "startComment"); }
				else if (!this.whiteSpace(currChar)) { this.throwError(currChar); }
			}

			//base tag context
			else if (currToken.type == "startBaseTag") {
				if (currChar.char == "[") { currToken = this.saveToken(currToken, "baseTag", currChar); }
				else { this.throwError(currChar, currToken); }
			}
			else if (currToken.type == "baseTag") { 
				if (currChar.char == "#") {
					if (currToken.content.length) { 
						this.saveToken(currToken);
						currToken = this.startToken(currChar, "startTagLabel");
						currToken = this.saveToken(currToken, "tagLabel");
					}
				}
				if (this.whiteSpace(currChar)) {
					if (currToken.content.length) { currToken = this.saveToken(currToken, "startTagLabel"); }
				}
				else if (currChar.char.match(/[a-zA-Z0-9-_]/)) { currToken = this.addCharToToken(currChar, currToken); }
				else if (currChar.char == "]" && currToken.content) { 
					this.saveToken(currToken);
					currToken = this.startToken(currChar, "endBaseTag"); 
				}
				else { this.throwError(currChar, currToken); }
			}
			else if (currToken.type == "startTagLabel") {
				if (currChar.char == "#") { currToken = saveToken(currToken, "tagLabel", currChar); }
				else if (currChar.char == "]") { startToken(currChar, "endBaseTag"); }
				else if (!this.whiteSpace(currChar)) { this.throwError(currChar); }
			}
			else if (currToken.type == "tagLabel") {
				if (currChar.char.match(/[a-zA-Z0-9-_]/)) { currToken = this.addCharToToken(currChar, currToken); }
				else if (this.whiteSpace(currChar) && currToken.content) { this.saveToken(currToken, "endBaseTag"); }
				else if (currChar.char == "]") { 
					this.saveToken(currToken);
					currToken = this.startToken(currChar, "endBaseTag");
					currToken = this.saveToken(currToken, "baseElement");
				}
			}

			//comment context
			else if (currToken.type == "startComment") {
				if (currChar.char == "!") { currToken = this.saveToken(currToken, "comment", currChar); }
				else { this.throwError(currChar); }
			}
			else if (currToken.type == "comment") {  }
			


			currChar = output.scanner.readNext(source);
		}
		return tokens;
	}
}

output.getFile = function (path) {
	fileSystem.readFile(filePath, "utf8", function(err, data) {
		if (err) { console.log(err); }
		else { output.parseNarra(data); }
	})
}

output.getMeta = function (fileStr) {
	let metaRaw = fileStr.match(/\*\[meta\][\S\s]*?\}[\*]/i)[0];
	metaRaw = metaRaw.match(/\{[\s\S]*\}/)[0];
	let metaClean = metaRaw.replace(/\r|\n|\t/g, "");
	let meta = metaClean.replace(/([a-zA-Z0-9-]+)[\s]*:/g, '"$1":');
	return JSON.parse(meta);
}

output.parseScenes = function (scenes) {
	for (let scene of scenes) {
		let sceneName = this.getTagName(scene, "scene", this.sceneNum);
		this.sceneNum++;
		scene += "*[";
		let elements = this.parseElements(scene.match(/\*\[[\s\S]*?(?=\*\[)/gi));
		
	}
	
}

output.parseElements = function (elements) {
	let scene = {};
	for (let element of elements) {
		let newElem = {};
		newElem.type = this.getElementType(element);
		if (this.isBaseElement(newElem.type)) {
			let elementName = this.getTagName(element, elementType, this.elementNum);
			this.elementNum++;
			newElem.content = getElementContent(element, newElem.type);
		}
		//create reference to element
		//add index of this element to previous element (if exists) 
		//store reference in scene object
	}

}

output.getTagName = function (element, type, index) {
	let nameMatch = element.match(/\#([a-zA-Z0-9-_]*)/);
	let elementName;
	if (nameMatch) { elementName = nameMatch[1]; }
	else { elementName = type + index; }
	return elementName;
}

output.getElementType = function (element) {
	let type = element.match(/\*\[([\S]*?)(?=[\s]|\])/i);
	return type[1].toLowerCase();
}

output.getElementContent = function (element, type) {
	if (type == "choice") {
		let options = {}
		let subElements = element.match(/(?<!\*)\[option[\s\S]*?(?=\[|\*)/gi);
		for (let sub of subElements) {

		}
	}
}

output.isBaseElement = function (type) {
	if (type == "text" || type == "choice") { return true; }
	else { return false; }
}

// output.saveScript = function (script, index) {
// 	let scriptName = script.match(/\#([a-zA-Z0-9-]*)/)[1];
// 	if (!scriptName) { scriptName = "script" + index; }
// 	scriptRaw = script.match(/\{([\s\S]*)\}/)[1];
// 	this.frame.scripts.refList.push(scriptName);
// 	this.frame.scripts[scriptName] = new Function("", scriptRaw.replace(/\r|\n|\t/g, ""));
// }

output.getInit = function (fileStr) {
	let initRaw = fileStr.match(/\*\[init\][\S\s]*?\}[\*]/i)[0];
	initRaw = initRaw.match(/\{([\s\S]*)\}/)[1];
	let initClean = initRaw.replace(/\r|\n|\t/g, "");
	return new Function("", initClean);
}

output.getFile(filePath);
