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
	scenes: []
}


output.parseNarra = function (narra) {
	let source = narra.match(/[\s\S]*?(\r\n|\r|\n)/g);
	let tags = this.getBaseTags(source);
	this.parseElements(tags, source);

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
		if (tagType.match(/(scene|script|choice)/)) return true;
		else if (tagType.match(/(meta|init|text)/)) return true;
		else return false;
	}
}

output.getFile = function (path) {
	fileSystem.readFile(filePath, "utf8", function(err, data) {
		if (err) { console.log(err); }
		else { output.parseNarra(data); }
	})
}

output.getMeta = function (source) {

	// let metaRaw = fileStr.match(/\*\[meta\][\S\s]*?\}[\*]/i)[0];
	// metaRaw = metaRaw.match(/\{[\s\S]*\}/)[0];
	// let metaClean = metaRaw.replace(/\r|\n|\t/g, "");
	// let meta = metaClean.replace(/([a-zA-Z0-9-]+)[\s]*:/g, '"$1":');
	// return JSON.parse(meta);
}

output.parseScenes = function (scenes) {
	for (let scene of scenes) {
		let sceneName = this.getTagName(scene, "scene", this.sceneNum);
		this.sceneNum++;
		scene += "*[";
		let elements = this.parseElements(scene.match(/\*\[[\s\S]*?(?=\*\[)/gi));
		
	}
	
}

output.parseElements = function (tags, source) {
	let scene = {};
	for (let tag of tags) {
		//if content tag, save appropriate content to scaffold
		//if scene tag, start new scene
		//else save 
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

output.saveScript = function (script, index) {
	let scriptName = script.match(/\#([a-zA-Z0-9-]*)/)[1];
	if (!scriptName) { scriptName = "script" + index; }
	scriptRaw = script.match(/\{([\s\S]*)\}/)[1];
	this.frame.scripts.refList.push(scriptName);
	this.frame.scripts[scriptName] = new Function("", scriptRaw.replace(/\r|\n|\t/g, ""));
}

output.getInit = function (fileStr) {
	let initRaw = fileStr.match(/\*\[init\][\S\s]*?\}[\*]/i)[0];
	initRaw = initRaw.match(/\{([\s\S]*)\}/)[1];
	let initClean = initRaw.replace(/\r|\n|\t/g, "");
	return new Function("", initClean);
}

output.getFile(filePath);
