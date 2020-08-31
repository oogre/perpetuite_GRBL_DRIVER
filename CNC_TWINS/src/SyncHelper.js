/*----------------------------------------*\
  GCODE - SyncHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-21 17:52:03
  @Last Modified time: 2020-08-31 15:09:49
\*----------------------------------------*/

import SerialPort from "serialport";
import Readline from '@serialport/parser-readline';

const HOST_NAME = require('os').hostname();


export default class SyncHelper{
	constructor({serialName, serialBaudrate, pingInterval, verbose}){
		this.serialName = serialName;
		this.serialBaudrate = serialBaudrate;
		this.verbose = verbose;
		this.serialPort;
		this.PING_HANDLER;
		this.eventHandlers = {
			ready : [()=>{
				this.PING_HANDLER = setInterval(() => this.send("ping"), pingInterval);
			}]
		};
	}
	run(){
		const receive = line => {
			const data = JSON.parse(line);
			if(this.verbose){
				console.log(`>>`, data);
			}
			if(data.origin!=HOST_NAME){
				(this.eventHandlers[data.eventName]||[]).map(action => action(data));
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
			setTimeout(()=>{
				this.triger("ready");
			}, 2000);
		});
		const parser = new Readline()
		this.serialPort.pipe(parser);
		parser.on('data', receive);			
	};
	stop(){
		clearInterval(this.PING_HANDLER);
	}
	triger(eventName, event=``){
		(this.eventHandlers[data.eventName]||[]).map(fnc=>fnc(event));
		return this;
	}
	on(eventName, fnc){
		this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
		this.eventHandlers[eventName].push(fnc);
		return this;
	}
	once(eventName, fnc){
		this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
		const wrappedFnc = event => {
			fnc(event);
			fnc=()=>{};
		}
		this.eventHandlers[eventName].push(wrappedFnc);
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