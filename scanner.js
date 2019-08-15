let scanner = {
	position: {
		line: 0,
		pos: 0
	},
	reset: function() {
		this.position = { line: 0, pos: 0 };
	},
	setHeadPosition: function (coords) {
		this.position = coords;
	},
	readNext: function (source) {
		this.position = this.getNextPos(source, this.position);
		if (!this.position) { return null; }
		else {
			return this.readChar(source, this.position);
		}
	},
	readChar: function (source, coords) {
		let character = {
			position: coords,
			char: source[coords.line][coords.pos],
			source: source
		};
		return character;
	},
	getNextPos: function (source, coords) {
		let newCoord = JSON.parse(JSON.stringify(coords));
		newCoord.pos++;
		if (newCoord.pos >= source[newCoord.line].length) {
			newCoord.line++;
			newCoord.pos = 0;
		}
		if (newCoord.line >= source.length) { return null; }
		else { return newCoord; }
	},
	getPrevPos: function (source, coords) {
		coords.pos--;
		if (coords.pos < 0) {
			coords.line--;
			coords.pos = source[coords.line].length - 1;
		}
		if (coords.line < 0) { return null; }
		else { return coords; }
	},
	lookAheadMatch: function (source, matchString, coords) {
		//read chars starting at line, pos
		let diff = false;
		searchCoord = this.getNextPos(source, coords);
		for (let i = 0; i < matchString.length; i++) {
			if (!diff) {
				let char = this.readChar(source, searchCoord);
				if (matchString[i] != char.char) { diff = true; }
				searchCoord = this.getNextPos(source, searchCoord);
			}
		}
		return diff;
	},
	lookBehindMatch: function (source, matchString, coords) {
		//read chars starting at line, pos
		let diff = false;
		searchCoord = this.getNextPos(source, coords);
		for (let i = matchString.length - 1; i >= 0; i--) {
			if (!diff) {
				let char = this.readChar(source, searchCoord);
				if (matchString[i] != char.char) { diff = true; }
				searchCoord = this.getPrevPos(source, searchCoord);
			}
		}
		return diff;
	},
	lookAheadRead: function (source, numChars, coords) {
		let output = "";
		searchCoord = this.getNextPos(source, coords);
		for (let i = 0; i < numChars; i++) {
			output += this.readChar(source, searchCoord).char;
			searchCoord = this.getNextPos(source, searchCoord);
		}
		return output;
	},
	lookBehindRead: function (source, numChars, coords) {
		let output = "";
		searchCoord = this.getPrevPos(source, coords);
		for (let i = 0; i < numChars; i++) {
			output += this.readChar(source, searchCoord).char;
			searchCoord = this.getPrevPos(source, searchCoord);
		}
		return output;
	}
}

module.exports = scanner;