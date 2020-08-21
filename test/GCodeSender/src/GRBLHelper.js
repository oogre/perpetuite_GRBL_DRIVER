/*----------------------------------------*\
  Perpetuite - GRBLHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-07 17:57:46
  @Last Modified time: 2020-08-21 12:52:22
\*----------------------------------------*/
import SerialPort from "serialport";
import Readline from '@serialport/parser-readline';

export default class GRBLHelper {
	constructor({SerialName, SerialBaudrate = 115200, GCodeData, verbose}){
		this.arduinoSerialPort = new SerialPort(SerialName, { baudRate : SerialBaudrate });
		this.arduinoSerialPort.on('open',function() {
			if(verbose){
				console.log('Serial Port ' + SerialName + ' is opened.');
			}
		});
		const parser = new Readline()
		this.arduinoSerialPort.pipe(parser);
		parser.on('data', line => this.dataInputHandler(line) );

		this.initialized = false;
		this.error = false;
		this.GCODE = GCodeData;
		this.verbose = verbose;
		this.eventHandlers = {
			ready : [],
			commandDone : [],
			error : []
		}
	}

	dataInputHandler(line){
		if(this.verbose){
			console.log(`>>`, line);
		}
		if(line.includes("error")){
			return this.triger(`error`, line);
		}
		if(!this.initialized){
			setTimeout(()=>this.triger(`ready`), 2000);
		}
		this.initialized = true;
		if(line.includes("ok")){
			this.triger(`commandDone`);
		}
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
		this.arduinoSerialPort.write(`${data}\n`);
	}
	sendLine(){
		const line = this.GCODE.shift();
		this.send(line);
		this.GCODE.push(line);
	}
}

