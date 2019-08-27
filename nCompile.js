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

let output = {};

output.scaffold = {
	sceneCount: 0,
	contentCount: 0,
	scenes: {},
	content: {}
}


output.parseNarra = function (narra) {
	let source = narra.match(/[\s\S]*?(\r\n|\r|\n)/g);
	let tags = this.getBaseTags(source);
	this.parseElements(tags, source);
	console.log(this.scaffold);
	//let scenes = narra.match(/(\*\[scene[\s\S]*?)(?=\*\[(scene|end))/gi);
	// this.parseScenes(scenes);
	//this.frame.meta = this.getMeta(source);
	//this.getScripts(narra);
	// this.frame.scripts.init = this.getInit(narra);
	// console.log(this.frame);
}

output.getBaseTags = function (source) {
	let currChar = scanner.readChar(source, {line: 0, pos: 0});
	let tags = [];
	let error = "";
	let currTag = null;
	let context = "";
	while (currChar && !error) {
		if (currTag) {
			currTag.tag += currChar.char;
			if (currChar.char == "*" && scanner.lookAheadRead(source, 1, currChar.position) == "[") { 
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
		else if (currChar.char == "*" && scanner.lookAheadRead(source, 1, currChar.position) == "[") {
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
		currChar = scanner.readNext(source);
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
	scanner.position = tag.endPos;
	let currChar = scanner.readChar(source, tag.endPos);
	let content = "";
	while (currChar) {
		content += currChar.char;
		currChar = scanner.readNext(source);
		if (currChar && currChar.char == "*" && scanner.lookAheadRead(source, 1, currChar.position) == "[") currChar = null;
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
	if (!tag.label) tag.label = "scene" + this.scaffold.sceneCount;
	tag.sceneIndex = this.scaffold.sceneCount;
	this.scaffold.sceneCount++;
	let sceneTitle = this.getTagContent(tag, source);
	sceneTitle = this.sanitize(sceneTitle);
	tag.title = sceneTitle;
	tag.flow = [];
	tag.content = this.scaffold.content;
	this.scaffold.scenes[tag.label] = tag;
	return tag;
}

output.sanitize = function (contentStr) {
	let content = contentStr.replace(/<![\s\S]*!>/g, "");
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
	if (!tag.label) tag.label = "text" + this.scaffold.contentCount;
	tag.contentIndex = this.scaffold.contentCount;
	tag.flowIndex = scene.flow.length;
	this.scaffold.contentCount++;
	let textContent = this.getTagContent(tag, source);
	textContent = this.sanitize(textContent);
	tag.text = textContent;
	scene.flow.push(tag.label);
	this.scaffold.content[tag.label] = tag;
}

output.saveChoice = function (tag, source) {
	console.log("saving choice @ " + tag.startPos.line + ", " + tag.startPos.pos);
}

output.saveScript = function (script, scene, index) {
	if (!tag.label) tag.label = "script" + this.scaffold.contentCount;
	tag.contentIndex = this.scaffold.contentCount;
	tag.flowIndex = scene.flow.length;
	this.scaffold.contentCount++;
	let scriptRaw = this.getTagContent(tag, source);
	let scriptMatch = scriptRaw.match(/{[\s\S]*?}(?=\*)/)[0];
	let scriptContent = {};
	if (scriptMatch) scriptContent = scriptMatch[0];
	tag.script = new Function (scriptContent);
	scene.flow.push(tag.label);
	this.scaffold.content[tag.label] = tag;
}

output.getInit = function (tag, source) {
	let initRaw = this.getTagContent(tag, source);
	let initMatch = initRaw.match(/{[\s\S]*?}(?=\*)/)[0];
	let initContent = {};
	if (initMatch) initContent = initMatch[0];
	this.scaffold.init = new Function (initContent);
}

output.getFile(filePath);
