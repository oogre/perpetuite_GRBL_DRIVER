/*----------------------------------------*\
  GCODE - gCodeHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-21 19:46:37
  @Last Modified time: 2020-08-21 22:56:27
\*----------------------------------------*/

import GRBLHelper from './GRBLHelper.js';
import SerialPort from "serialport";
import Readline from '@serialport/parser-readline';

export default class GCodeHelper{
	constructor({serialName, serialBaudrate, verbose}){
		this.serialName = serialName;
		this.serialBaudrate = serialBaudrate;
		this.verbose = verbose;
		this.eventHandlers = {
			ready : [],
			commandDone : [],
			error : []
		}
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
				if(this.verbose){
					console.log(`>>`, line);
				}
				if(line.includes("error")){
					return self.triger(`error`, line);
				}
				if(!self.initialized){
					setTimeout(()=>self.triger(`ready`), 2000);
				}
				self.initialized = true;
				if(line.includes("ok")){
					self.triger(`commandDone`);
				}
			}
			parser.on('data', receive);
			
		})
	}
	on(eventName, fnc){
		this.eventHandlers[eventName].push(fnc);
		return this;
	}
	triger(eventName, event=``){
		this.eventHandlers[eventName].map(fnc=>fnc(event));
		return this;
	}
	feedHold(){
		this.send(`!`);
	}
	send(data){
		if(this.verbose){
			console.log(`<<`, data);
		}
		this.serialPort.write(`${data}\n`);
	}
}
