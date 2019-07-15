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
	frame: {
		scripts: {},
		data: {}
	},
}

output.parseNarra = function (narra) {
	this.frame.meta = this.getMeta(narra);
	this.frame.scripts = this.getScripts(narra);
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

output.getScripts = function(fileStr) {
	let scripts = fileStr.match(/\*\[script[\S\s]*?\}\*/gi);
	let cleanScripts = {}
	let scriptNum = 1;
	for (let script of scripts) {
		let scriptName = script.match(/\#([a-zA-Z0-9-]*)/)[1];
		if (!scriptName) { scriptName = "script" + scriptNum; }
		scriptRaw = script.match(/\{[\s\S]*\}/)[0];
		scriptClean = scriptRaw.replace(/\r|\n|\t/g, "");
		let func = new Function("", scriptClean);
		let output = {
			exec: func,
			index: scriptNum
		}
		cleanScripts[scriptName] = output;
		scriptNum++;
	}
	return cleanScripts;
} 

output.getInit = function (fileStr) {
	let initRaw = fileStr.match(/\*\[init\][\S\s]*?\}[\*]/i)[0];
	initRaw = initRaw.match(/\{[\s\S]*\}/)[0];
	let initClean = initRaw.replace(/\r|\n|\t/g, "");
	return new Function("", initClean);
}

output.getFile(filePath);
