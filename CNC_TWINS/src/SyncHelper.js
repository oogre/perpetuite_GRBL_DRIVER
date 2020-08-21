/*----------------------------------------*\
  GCODE - SyncHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-21 17:52:03
  @Last Modified time: 2020-08-22 00:20:18
\*----------------------------------------*/

import SerialPort from "serialport";
import Readline from '@serialport/parser-readline';

const HOST_NAME = require('os').hostname();

export default class SyncHelper{
	constructor({serialName, serialBaudrate, verbose}){
		this.serialName = serialName;
		this.serialBaudrate = serialBaudrate;
		this.verbose = verbose;
		this.serialPort;
		this.eventHandlers = {};
	}
	init(){
		const self = this;
		return new Promise((resolve, reject) => {
			self.serialPort = new SerialPort(self.serialName, { baudRate : self.serialBaudrate });
			self.serialPort.on('open',function() {
				if(self.verbose){
					console.log(`Serial Port ${self.serialName} is opened.`);
				}
				setTimeout(()=>{
					resolve(self);
				}, 2000)
			});
			const parser = new Readline()
			self.serialPort.pipe(parser);
			const receive = line => {
				const data = JSON.parse(line);
				if(self.verbose){
					console.log(`>>`, data);
				}
				if(data.origin!=HOST_NAME){
					(self.eventHandlers[data.eventName]||[]).map(action => action(data));
				}	
			}
			parser.on('data', receive);	
		});
	}
	on(eventName, fnc){
		this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
		this.eventHandlers[eventName].push(fnc);
		return this;
	}
	send(eventName, data){
		const content = {
			origin : HOST_NAME,
			eventName : eventName,
			data : data
		};
		if(this.verbose){
			console.log(`<<`, content);
		}
		this.serialPort.write(`${JSON.stringify(content)}\n`);
	}
}