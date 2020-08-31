/*----------------------------------------*\
  Perpetuite - FSHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-07 17:59:35
  @Last Modified time: 2020-08-31 17:22:54
\*----------------------------------------*/
const fs = require('fs');


class FSHelperTools{
	static readLines(input, func) {
		return new Promise( resolve => {
			let remaining = '';
			input.on('data', data => {
				remaining += data;
				let index = remaining.indexOf('\r\n');
				while (index > -1) {
					let line = remaining.substring(0, index);
					remaining = remaining.substring(index + 2);
					func(line);
					index = remaining.indexOf('\r\n');
				}
			});
			input.on('end', () => {
				if (remaining.length > 0) {
					func(remaining);
				}
				resolve();
			});
		});
	}
}


export default class FSHelper {
	static async loadFileInArray(path){
		const input = fs.createReadStream(path);
		let array = [];
		await FSHelperTools.readLines(input, data => array.push(data) );	
		return array;
	}
}