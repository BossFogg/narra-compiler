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
		scripts: {
			refList: [],
			scriptOfIndex: function(refID, args) {
				if (!args.length) { args = []; }
				let scriptRef = this.refList[refID];
				scripts[scriptRef].apply(scripts, args);
			}
		},
		scenes: {
			refList: [],
			sceneOfIndex: function(refID, args) {
				if (!args.length) { args = []; }
				let sceneRef = this.refList[refID];
				scenes[sceneRef].apply(scenes, args);
			}
		},
		elements: {
			refList: [],
			sceneOfIndex: function(refID, args) {
				if (!args.length) { args = []; }
				let elementRef = this.refList[refID];
				scenes[elementRef].apply(elements, args);
			}
		},
		data: {}
	},
}

output.parseNarra = function (narra) {
	let scenes = narra.match(/(\*\[scene[\s\S]*?)(?=\*\[(scene|end))/gi);
	this.parseScenes(scenes);
	this.frame.meta = this.getMeta(narra);
	//this.getScripts(narra);
	this.frame.scripts.init = this.getInit(narra);
	console.log(this.frame);
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
			//save element based on type
		}
		//create reference to element
		//add index of this element to previous element (if exists) 
		//store reference in scene object
	}

}

output.getTagName = function (element, type, index) {
	let nameMatch = element.match(/\#([a-zA-Z0-9-]*)/);
	let elementName;
	if (nameMatch) { elementName = nameMatch[1]; }
	else { elementName = type + index; }
	return elementName;
}

output.getElementType = function (element) {
	let type = element.match(/\*\[([\S]*?)(?=[\s]|\])/i);
	return type[1];
}

output.isBaseElement = function (type) {
	if (type.toLowerCase() == "text") { return true; }
	else if (type.toLowerCase() == "choice") { return true; }
	else if (type.toLowerCase() == "script") { return true; }
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
