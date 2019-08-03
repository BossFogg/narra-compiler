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
	tokens = this.lexer.getTokens(source);
	console.log(tokens);
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
	context: [],
	error: false,
	throwError: function (char, token) {
		this.error = true;
		let line = char.line;
		let pos = char.position;
		if (token && (token.line || token.pos)) {
			line = token.line;
			pos = token.position;
		}
		let errString = char.source[line].slice(pos);
		let unexpected =  errString.match(/[\S]*(?=[\s])/);
		console.log("Unexpected token " + unexpected + " with context " + token.type + " at (" + line + ", " + pos + ")");
		console.log(this.context);
		console.log(this.tokens);

	},
	enterContext: function (context) { this.context.push(context); },
	previousContext: function () { this.context.pop(); },
	resetContext: function () { this.context = []; },
	whiteSpace: function (char) {
		if (char.char.match(/[\s]/)) { return true; }
		return false;
	},
	viewNextChar: function (char) {
		let nextChar =  output.scanner.readChar(char.source, char.line, char.position + 1);
		return nextChar;
	},
	blankToken: function (source, context) {
		return {
			content: "",
			type: (context) ? context : "",
			line: 0,
			position: 0,
		}
	},
	startToken: function (char, context) {
		return {
			content: char.char,
			type: context,
			line: char.line,
			position: char.position,
		};
	},
	addCharToToken: function (char, token) {
		return {
			content: token.content + char.char,
			type: token.type,
			line: (token.content) ? token.line : char.line,
			position: (token.content) ? token.position : char.position,
		}
	},
	saveToken: function (token, newContext, char) {
		if (char) { token.content += char.char; }
		this.tokens.push(token);
		console.log(token.content + "  " + token.type);
		return this.blankToken(token.source, newContext);
	},
	readNoContext: function (char, token) {
		if (char.char == "*") { 
			token = this.startToken(char, "startBaseTag");
			this.enterContext("baseTag");
		}
		else if (char.char == "<") { 
			token = this.startToken(char, "startComment");
			this.enterContext("comment");
		}
		else if (!this.whiteSpace(char)) { this.throwError(char); }
		return token;
	},
	readBaseTag: function (char, token) {
		if (char.char == "#") {
			if (token.content.length) { 
				this.saveToken(token);
				token = this.startToken(char, "startTagLabel");
				token = this.saveToken(token, "tagLabel");
			}
			else { this.throwError(char, token); }
		}
		if (this.whiteSpace(char)) {
			if (token.content.length) { token = this.saveToken(token, "startTagLabel"); }
		}
		else if (char.char.match(/[a-zA-Z0-9-_]/)) { token = this.addCharToToken(char, token); }
		else if (char.char == "]" && token.content) { 
			token = this.saveToken(token, "endBaseTag");
			token = this.saveToken(token, "baseElement", char);
			this.enterContext("baseElement");
		}
		else { this.throwError(char, token); }
		return token;
	},
	readStartBaseTag: function (char, token) {
		if (char.char == "[") { token = this.saveToken(token, "baseTag", char); }
		else { this.throwError(char, token); }
		return token;
	},
	readStartTagLabel: function (char, token) {
		if (char.char == "#") { 
			if (token.content.length) { this.throwError(char, token); }
			else { token = this.saveToken(token, "tagLabel", char); }
		}
		else if (char.char == "]") { 
			token.type = "endBaseTag";
			token = this.saveToken(token, "baseElement"); 
		}
		else if (!this.whiteSpace(char)) { this.throwError(char); }
		return token;
	},
	readTagLabel: function (char, token) {
		if (char.char.match(/[a-zA-Z0-9-_]/)) { token = this.addCharToToken(char, token); }
		else if (char.char == ".") { 
			if (token.content.length) {
				this.saveToken(token, "within");
				token = this.startToken(char, "tagLabel");
			}
			else { this.throwError(char, token); }
		}
		else if (this.whiteSpace(char) && token.content) { this.saveToken(token, "endBaseTag"); }
		else if (char.char == "]") { 
			this.saveToken(token);
			token = this.startToken(char, "endBaseTag");
			token = this.saveToken(token, "baseElement");
			this.enterContext("baseElement");
		}
		return token;
	},
	readEndBaseTag: function (char, token) {
		if (char.char == "]") { 
			token = this.saveToken(token, "baseElement", char); 
			this.enterContext("baseElement");
		}
		else if (!this.whiteSpace(char)) { this.throwError(char, token); }
		return token;
	},
	readBaseElement: function (char, token) {
		//action or text
		if (char.char == "[" && this.viewNextChar(char) == "!") { 
			token.type = "startAction";
			token = this.addCharToToken(char, token); 
			this.enterContext("action");
		}
		if (char.char == "<" && this.viewNextChar(char) == "*") { 
			token.type = "startComment";
			token = this.addCharToToken(char, token); 
			this.enterContext("comment");
		}
		else if (char.char == "{") { 
			token.type = "startScript";
			token = this.saveToken(token, "scriptContent", char);
			this.enterContext("scriptContent");
		}
		else if (!this.whiteSpace(char)) { 
			token = this.startToken(char, "textContent"); 
			this.enterContext("textContent");
		}
		return token;
	},
	readStartAction: function (char, token) {
		if (char.char == "!") { token = this.saveToken(token, "action", char); }
		else { this.throwError(char); }
		return token;
	},
	readAction: function (char, token) {
		if (char.char.match(/[a-zA-Z0-9-_]/)) { token = this.addCharToToken(char, token); }
		else if (char.char == "]" || (token.content.length && this.whiteSpace(char))) {
			token = this.saveToken(token, "endAction");
			if (char.char == "]") { 
				this.previousContext();
				token = this.saveToken(token, this.context[this.context.length - 1], char); 
			}
		}
		else { this.throwError(char, token); }
		return token;
	},
	readEndAction: function (char, token) {
		if (char.char == "]") {
			this.previousContext();
			token = this.saveToken(token, this.context[this.context.length - 1], char);
		}
		else if (!this.whiteSpace(char)) { this.throwError(char, token); }
		return token;
	},
	readStartComment: function (char, token) {
		if (char.char == "*") { token = this.saveToken(token, "comment", char); }
		else { this.throwError(char); }
		return token;
	},
	readComment: function (char, token) {
		if (char.char == "*" && this.viewNextChar(char).char == ">") { token = this.startToken(char, "endComment"); }
		return token;
	},
	readEndComment: function (char, token) {
		if (char.char == ">") { 
			this.previousContext();
			token = this.saveToken(token, this.context[this.context.length - 1], char);
		}
		return token;
	},
	readScriptContent: function (char, token) {
		if (char.char == "}" && this.viewNextChar(char).char == "*") { 
			token = this.saveToken(token, "endScript");
			token = this.addCharToToken(char, token);
		}
		else { token = this.addCharToToken(char, token); }
		return token;
	},
	readScriptEnd: function (char, token) {
		if (char.char == "*") { 
			token = this.saveToken(token, "", char); 
			this.resetContext();
		}
		return token;
	},
	readTextContent: function (char, token) {
		if (char.char == "[" && this.viewNextChar(char).char == "!") { 
			this.enterContext("action");
			token = this.saveToken(token, "startAction");
			token = this.addCharToToken(char, token);
		}
		else if (char.char == "*" && this.viewNextChar(char).char == "[") {
			this.enterContext("baseTag");
			token = this.saveToken(token, "startBaseTag");
			token = this.addCharToToken(char, token);
		}
		else if (char.char == "<" && this.viewNextChar(char).char == "*") {
			this.enterContext("comment");
			token = this.saveToken(token, "startComment");
			token = this.addCharToToken(char, token);
		}
		else if (char.char == "<" && this.viewNextChar(char).char == "!") {
			this.enterContext("inlineScript");
			token = this.saveToken(token, "startInlineScript");
			token = this.addCharToToken(char, token);
		}
		else { token = this.addCharToToken(char, token); }
		return token;
	},
	readStartInlineScript: function (char, token) {
		if (char.char == "!") { token = this.saveToken(token, "inlineScript"); }
		else { this.throwError(char, token); }
		return token;
	},
	readInlineScript: function (char, token) {
		if (char.char == "!" && this.viewNextChar(char).char == ">") {
			token = this.saveToken(token, "endInlineScript");
			token = this.addCharToToken(char, token);
		}
		else { token = this.addCharToToken(char, token); }
		return token;
	},
	readEndInlineScript: function (char, token) {
		if (char.char == ">") {
			this.previousContext();
			token = this.saveToken(token, this.context[this.context.length - 1], char);
		}
		else { this.throwError(char, token); }
		return token;
	},
	getTokens: function (source) {
		let currChar = output.scanner.readChar(source, 0, 0);
		let currToken = this.blankToken(source);
		while (currChar && !this.error) {
			if (!currToken.type) { currToken = this.readNoContext(currChar, currToken); }
			else if (currToken.type == "startBaseTag") { currToken = this.readStartBaseTag(currChar, currToken); }
			else if (currToken.type == "baseTag") { currToken = this.readBaseTag(currChar, currToken); }
			else if (currToken.type == "startTagLabel") { currToken = this.readStartTagLabel(currChar, currToken); }
			else if (currToken.type == "tagLabel") { currToken = this.readTagLabel(currChar, currToken); }
			else if (currToken.type == "endBaseTag") { currToken = this.readEndBaseTag(currChar, currToken); }
			else if (currToken.type == "baseElement") { currToken = this.readBaseElement(currChar, currToken); }
			else if (currToken.type == "startComment") { currToken = this.readStartComment(currChar, currToken); }
			else if (currToken.type == "comment") { currToken = this.readComment(currChar, currToken); }
			else if (currToken.type == "endComment") { currToken = this.readEndComment(currChar, currToken); }
			else if (currToken.type == "scriptContent") { currToken = this.readScriptContent(currChar, currToken); }
			else if (currToken.type == "endScript") { currToken = this.readScriptEnd(currChar, currToken); }
			else if (currToken.type == "startAction") { currToken = this.readStartAction(currChar, currToken); }
			else if (currToken.type == "action") { currToken = this.readAction(currChar, currToken); }
			else if (currToken.type == "endAction") { currToken = this.readEndAction(currChar, currToken); }
			else if (currToken.type == "textContent") { currToken = this.readTextContent(currChar, currToken); }
			else if (currToken.type == "startInlineScript") { currToken = this.readStartInlineScript(currChar, currToken); }
			else if (currToken.type == "inlineScript") { currToken = this.readInlineScript(currChar, currToken); }
			else if (currToken.type == "endInlineScript") { currToken = this.readEndInlineScript(currChar, currToken); }
			//add transition from baseTagContent to action
			//include "action paramenter" in lexicon

			currChar = output.scanner.readNext(source);
			//console.log(currChar.char + " (" + currChar.line + "," + currChar.position + ")");
		}
		return this.tokens;
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
