/*----------------------------------------*\
  GCODE - gCodeHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-21 19:46:37
  @Last Modified time: 2020-08-22 14:16:33
\*----------------------------------------*/

import SerialPort from "serialport";
import Readline from '@serialport/parser-readline';

export default class GCodeHelper{
	constructor({serialName, serialBaudrate, verbose}){
		this.serialName = serialName;
		this.serialBaudrate = serialBaudrate;
		this.verbose = verbose;
		this.serialPort;
		this.initialized = false;
		this.homing = false;
		this.eventHandlers = {
			ready : [],
			commandDone : [],
			error : []
		}
	}
	run(){
		const receive = line => {
			if(this.verbose){
				console.log(`>>`, line);
			}
			if(line.includes("error")){
				return this.triger(`error`, line);
			}

			if(!this.initialized){
				this.initialized = true;
				setTimeout(()=>{
					this.homing = true;
					this.send("$H");
				}, 2000);
			}
			
			if(line.includes("ok")){
				if(this.homing){
					this.homing = false;
					return this.triger(`ready`);
				}
				this.triger(`commandDone`);
			}
		}
		
		this.serialPort = new SerialPort(
			this.serialName, 
			{ baudRate : this.serialBaudrate }
		);
		this.serialPort.on('open',() => {
			if(this.verbose){
				console.log(`Serial Port ${this.serialName} is opened.`);
			}
		});
		const parser = new Readline()
		this.serialPort.pipe(parser);
		parser.on('data', receive);
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
