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
	frame: {
		scripts: {
			refList: [],
			scriptOfIndex: function(refID, args) {
				if (typeof refID != "Number") {
					console.log("ERROR: Reference ID must be a number!");
					return;
				}
				if (!args.length) { args = []; }
				let scriptRef = this.refList[refID];
				scripts[scriptRef].apply(scriptsObj, args);
			}
		},
		data: {}
	},
}

output.parseNarra = function (narra) {
	let scenes = narra.match(/(\*\[scene[\s\S]*?)(?=\*\[(scene|end))/gi);
	console.log(scenes);
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

output.parseScenes = function (script) {
	//cycle through scenes and break apart into component parts
}

// output.getScripts = function(fileStr) {
// 	let scripts = fileStr.match(/\*\[script[\S\s]*?\}\*/gi);
// 	for (let script of scripts) {
// 		this.saveScript(script, scriptNum);
// 		scriptNum++;
// 	}
// } 

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


export default output;