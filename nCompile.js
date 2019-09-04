const readline = require("readline");
const fileSystem = require("fs");
let scanner = require("./scanner.js");

let rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

let filePath = "";

if (process.argv.length < 3) {
	console.log("Oops! No target specified!");
	rl.question("Please provide a path to your .narra file ", (answer) => {
		//console.log(answer);
		filePath = answer;
		rl.close;
	})
}
else { 
	filePath = process.argv[2];
	//console.log(filePath);
	rl.close;
}

let output = {
	sceneCount: 0,
	contentCount: 0,
	scanner: scanner,
	scaffold: {
		scenes: {
			nextIndex: 0
		},
		content: {
			nextIndex: 0,
			tagList: [],
			loadChoice: function(options) {
				for (let option of options) {
					let exec;
					try { exec = new Function(option); }
					catch { console.log("Unable to compile option code " + option); }
					if (exec) exec();
				}
			}
		},
		choices: {
			current: []
		}
	}
};

output.scaffold.content.choices = output.scaffold.choices;

output.parseNarra = function (narra) {
	let source = narra.match(/[\s\S]*?(\r\n|\r|\n)/g);
	let tags = this.getBaseTags(source);
	this.parseElements(tags, source);
	//console.log(this.scaffold);
	//let scenes = narra.match(/(\*\[scene[\s\S]*?)(?=\*\[(scene|end))/gi);
	// this.parseScenes(scenes);
	//this.frame.meta = this.getMeta(source);
	//this.getScripts(narra);
	// this.frame.scripts.init = this.getInit(narra);
	// console.log(this.frame);
}

output.getBaseTags = function (source) {
	let currChar = this.scanner.readChar(source, {line: 0, pos: 0});
	let tags = [];
	let error = "";
	let currTag = null;
	let context = "";
	while (currChar && !error) {
		if (currTag) {
			currTag.tag += currChar.char;
			if (currChar.char == "*" && this.scanner.lookAheadRead(source, 1, currChar.position) == "[") { 
				error = "unexpected token *[ at line " + currChar.position.line + "," + currChar.position.pos;
			}
			else if (currChar.char == "#") {
				if (!currTag.link || currTag.label) {
					error = "unexpected token # at line " + currChar.position.line + "," + currChar.position.pos;
					error += " tag label cannot come before tag type";
				}
				else {
					context = "label";
					let type = currTag.link.toLowerCase();
					if (isContentTag(type)) currTag.type = type;
					else {
						error = "unexpected token # at line " + currChar.position.line + "," + currChar.position.pos;
						error += " labels cannot be applied to a reference tag!"
					}
				}
			}
			if (currChar.char.match(/[a-zA-Z0-9-\_]/)) {
				if (context) currTag[context] += currChar.char;
			}
			if (currChar.char == "]") {
				if (!currTag.link) {
					error = "unexpected token ] at line " + currChar.position.line + "," + currChar.position.pos;
					error += " tags cannot be empty!";
				}
				else {
					if (!currTag.type && isContentTag(currTag.link)) currTag.type = currTag.link;
					currTag.endPos = { line: currChar.position.line, pos: currChar.position.pos + 1 };
					tags.push(JSON.parse(JSON.stringify(currTag)));
					currTag = null;
					context = "";
				}
			}
		}
		else if (currChar.char == "*" && this.scanner.lookAheadRead(source, 1, currChar.position) == "[") {
			currTag = {
				startPos: currChar.position,
				endPos: {},
				type: "",
				label: "",
				link: "",
				tag: "*"
			}
			context = "link";
		}
		//if (currTag) console.log(currTag);
		currChar = this.scanner.readNext(source);
	}
	if (error) {
		console.log(error);
		console.log(tags);
	}

	return tags;

	function isContentTag(tagType) {
		if (tagType == "script" || tagType == "scene" || tagType == "choice") return true;
		else if (tagType == "meta" || tagType == "text" || tagType == "init") return true;
		return false;
	}
}

output.getFile = function (path) {
	fileSystem.readFile(filePath, "utf8", function(err, data) {
		if (err) { console.log(err); }
		else { output.parseNarra(data); }
	})
}

output.getTagContent = function (tag, source) {
	this.scanner.position = tag.endPos;
	let currChar = this.scanner.readChar(source, tag.endPos);
	let content = "";
	while (currChar) {
		content += currChar.char;
		currChar = this.scanner.readNext(source);
		if (currChar && currChar.char == "*" && this.scanner.lookAheadRead(source, 1, currChar.position) == "[") currChar = null;
	}
	return content;
}

output.getMeta = function (tag, source) {
	let metaRaw = this.getTagContent(tag, source);
	let metaContent = metaRaw.match(/{[\s\S]*}?(?=\*)/)[0];
	metaContent = metaContent.replace(/['"]?([a-zA-Z0-9-_]+)['"]?\s*(?=:)/g, "\"$1\"");
	metaContent = metaContent.replace(/(?<=:)\s*['"]?([\s\S]+?)['"]?\s*(?=,|(\s*}))/g, "\"$1\"");
	this.scaffold.meta = JSON.parse(metaContent);
}

output.startScene = function (tag, source) {
	if (!tag.label) tag.label = "scene" + this.sceneCount;
	tag.sceneIndex = this.sceneCount;
	this.sceneCount++;
	let sceneTitle = this.getTagContent(tag, source);
	sceneTitle = this.sanitize(sceneTitle);
	tag.title = sceneTitle;
	tag.flow = [];
	tag.content = this.scaffold.content;
	this.scaffold.scenes[tag.label] = tag;
	return tag;
}

output.sanitize = function (contentStr) {
	let content = contentStr.replace(/<\*[\s\S]*\*>/g, "");
	content = content.replace(/[\s]*(\S[\s\S]*\S)[\s]*/, "$1");
	content = content.replace(/^[\t]*/gm, "");
	content = content.replace(/[\s]*/, "");
	return content;
}

output.parseElements = function (tags, source) {
	let scene;
	let noSceneMsg = " because it is not within a valid scene!";
	for (let tag of tags) {
		//if content tag, save appropriate content to scaffold
		if (tag.type) {
			switch (tag.type) {
				case "meta": 
					if (scene) skipMsg(tag, " Meta tag cannot be used inside a scene!");
					else if (this.meta) skipMsg(tag, " Only one meta tag allowed!");
					else this.getMeta(tag, source);
					break;
				case "init": 
					if (scene) skipMsg(tag, " Init tag cannot be used inside a scene!");
					else if (this.init) skipMsg(tag, " Only one init function allowed!");
					else this.getInit(tag, source);
					break;
				case "scene": 
					scene = this.startScene(tag, source);
					break;
				case "text":
					if (scene) this.saveText(tag, scene, source);
					else skipMsg(tag, noSceneMsg);
					break;
				case "choice":
					if (scene) this.saveChoice(tag, scene, source);
					else skipMsg(tag, noSceneMsg);
					break;
				case "script":
					if (scene) this.saveScript(tag, scene, source);
					else skipMsg(tag, noSceneMsg);
					break;
				default: 
					skipMsg(tag, " because it is not a valid content tag!");
			}
		}
		else if (tag.link) {
			if (scene) {
				tag.flowIndex = scene.flow.length;
				scene.flow.push(tag);
			}
			else skipMsg(tag, " because it is not inside a valid scene!");
		}
	}

	function skipMsg(tag, reason) {
		console.log("Skipping " + tag.type + " at " + tag.startPos.line + "," + tag.startPos.pos + reason);
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

output.isBaseElement = function (type) {
	if (type == "text" || type == "choice") { return true; }
	else { return false; }
}

output.saveText = function (tag, scene, source) {
	if (!tag.label) tag.label = "text" + this.contentCount;
	tag.flowIndex = scene.flow.length;
	this.contentCount++;
	let textContent = this.getTagContent(tag, source);
	textContent = this.sanitize(textContent);
	scene.flow.push(tag);
	this.scaffold.content.tagList.push(tag);
	this.scaffold.content[tag.label] = textContent;
}

output.saveChoice = function (tag, scene, source) {
	if (!tag.label) tag.label = "choice" + this.contentCount;
	tag.flowIndex = scene.flow.length;
	this.contentCount++;
	let choiceRaw = this.getTagContent(tag, source);
	choiceContent = this.sanitize(choiceRaw);
	let options = this.getOptions(choiceContent, tag.startPos);
	console.log(options);
	scene.flow.push(tag);
	this.scaffold.content.tagList.push(tag);
	this.scaffold.content[tag.label] = options;
}

output.getOptions = function (choiceStr, pos) {
	choiceStr += "[";
	let choiceMatch = choiceStr.match(/\[>[\s\S]*?(?=\[)/g);
	let options = [];
	for (let i = 0; i < choiceMatch.length; i++) {
		options.push(this.parseOption(choiceMatch[i], pos, i))
	}
	return options;
}

output.parseOption = function (optStr, choicePos, optionIndex) {
	let option = {
		tag: optStr.match(/(?<=\[>\s*)\S[\s\S]*\S(?=\s*<\])/)[0],
		text: optStr.match(/(?<=\<]\s*)\S[\s\S]*/)[0],
	}
	option.text = option.text.replace(/[\r\n]/g, "");
	let tokens = this.tokenizeAction(option.tag);
	//console.log(tokens);
	let codeString = "\"{";
	let conditionalDisplay = null;
	let conditionalLink = null;
	let expressionExpected = false;
	let optionFound = false;
	let link1Found = false;
	let link2Found = null;
	//run through token list and piece together what needs to happen
	for (let token of tokens) {
		let addToken = true;
		let prepend = "";
		let append = "";
		
		if (!optionFound) {
			if (token.token == "option") {
				optionFound = true;
				addToken = false;
			}
			else if (token.token == "if" && !conditionalDisplay) {
				conditionalDisplay = true;
				expressionExpected = true;
			}
			else if (token.type == "expression" && expressionExpected) {
				append = "{";
				expressionExpected = false;
			}
			else {
				throwOptionError(choicePos, token, "expected OPTION keyword");
				addToken = false;
			}
		}
		else if (!link1Found) {
			if (token.token == "if") {
				if (!conditionalLink) {
					conditionalLink = true;
					expressionExpected = true;
				}
				else if (expressionExpected) {
					throwOptionError(choicePos, token, "expected expression");
					addToken = false;
				}
				else {
					throwOptionError(choicePos, token, "link expected");
					addToken = false;
				}
			}
			else if (token.type == "expression") {
				if (expressionExpected) {
					append = "{";
					expressionExpected = false;
				}
				else {
					throwOptionError(choicePos, token, "link expected");
					addToken = false;
				}
			}
			else if (token.token != "else" && token.token != "option") {
				link1Found = true;
				prepend = "this.choices.current.push({link:'";
				append = "',text:'" + option.text + "'});";
			}
			else {
				throwOptionError(choicePos, token, "link expected");
				addToken = false;
			}
		}
		else if (conditionalLink) {
			if (link2Found === null) {
				if (token.token == "else") {
					prepend = "}";
					append = "{";
					link2Found = false;
				}
				else if (token.token != "if" && token.token != "option" && token.type != "expression") {
					link2Found = true;
					prepend = "this.choices.current.push({link:'";
					append = "',text:'" + option.text + "'});";
				}
				else {
					throwOptionError(choicePos, token, "ELSE or link expected");
					addToken = false;
				}
			}
			else if (link2Found === false) {
				if (token.token != "if" && token.token != "else" && token.token != "option" && token.type != "expression") {
					link2Found = true;
					prepend = "this.choices.current.push({link:'";
					append = "',text:'" + option.text + "'});";
				}
				else {
					throwOptionError(choicePos, token, "link expected");
					addToken = false;
				}
			}
			else {
				throwOptionError(choicePos, token, "No further parameters expected");
				addToken = false;
			}
		}
		
		if (addToken) codeString += prepend + token.token + append;
	}
	if (conditionalLink) codeString += "}";
	if (conditionalDisplay) codeString += "}";
	codeString += "}\"";
	return codeString;

	function throwOptionError(choicePos, token, text) {
		let unexpectedMsg1 = "Unexpected token " + token.token + " at position ";
		let unexpectedMsg2 = " for option " + optionIndex + " of choice at " + choicePos.line + "," + choicePos.pos + ": ";
		console.log(unexpectedMsg1 + token.pos + unexpectedMsg2 + text)
	}
}

output.tokenizeAction = function (actStr) {
	let tokens = [];
	actStr = actStr.toLowerCase();
	let parenthesis = 0;
	let currToken = {
		token: "",
		type: ""
	};
	for (let i = 0; i < actStr.length; i++) {
		//(expression) OPTIONAL
		if (!currToken.type) {
			if (actStr[i] == "(") {
				currToken.type = "expression";
				currToken.pos = i;
			}
			else if (!actStr[i].match(/\s/)) {
				currToken.type = "actionParam";
				currToken.pos = i;
			}
		}
		else if (actStr[i].match(/\s/) && !parenthesis) {
			tokens.push(currToken);
			currToken = {
				token: "",
				type: ""
			}
		}
		if (currToken.type == "expression") {
			if (actStr[i] == "(") parenthesis++;
			else if (actStr[i] == ")") parenthesis--;
		}
		if (currToken.type) currToken.token += actStr[i];
	}
	tokens.push(currToken);
	return tokens;
}

output.saveScript = function (tag, scene, source) {
	if (!tag.label) tag.label = "script" + this.contentCount;
	tag.flowIndex = scene.flow.length;
	this.contentCount++;
	let scriptRaw = this.getTagContent(tag, source);
	let scriptMatch = scriptRaw.match(/{[\s\S]*?}(?=\*)/);
	let scriptContent = "{}";
	if (scriptMatch) scriptContent = scriptMatch[0];
	scene.flow.push(tag);
	this.scaffold.content.tagList.push(tag);
	this.scaffold.content[tag.label] = new Function (scriptContent);
}

output.getInit = function (tag, source) {
	let initRaw = this.getTagContent(tag, source);
	let initMatch = initRaw.match(/{[\s\S]*?}(?=\*)/);
	let initContent = "{}";
	if (initMatch) initContent = initMatch[0];
	this.scaffold.init = new Function (initContent);
}

output.getFile(filePath);

module.exports = output;
