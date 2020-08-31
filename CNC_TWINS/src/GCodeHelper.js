/*----------------------------------------*\
  GCODE - gCodeHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-21 19:46:37
  @Last Modified time: 2020-08-31 14:13:18
\*----------------------------------------*/

import SerialPort from "serialport";
import Readline from '@serialport/parser-readline';

class GCodeHelperTool{
	static setState(state){
		if(state != GCodeHelperTool.STATE){
			GCodeHelperTool.MACHINE.STATE = state
			GCodeHelperTool.triger(state);
		}
	}
	static on(eventName, fnc){
		GCodeHelperTool.eventHandlers[eventName] = GCodeHelperTool.eventHandlers[eventName] || [];
		GCodeHelperTool.eventHandlers[eventName].push(fnc);
	}
	static once(eventName, fnc){
		GCodeHelperTool.eventHandlers[eventName] = GCodeHelperTool.eventHandlers[eventName] || [];
		const wrappedFnc = event => {
			fnc(event);
			fnc=()=>{};
		}
		GCodeHelperTool.eventHandlers[eventName].push(wrappedFnc);
	}
	static triger(eventName, event={}){
		event.machine = GCodeHelperTool.MACHINE;
		event.name = eventName;
		(GCodeHelperTool.eventHandlers[eventName]||[]).map(fnc=>fnc(event));
	}
	static receive(line, verbose=false){
		if(line.includes("Grbl")){
			setInterval(() => {
				if(!GCodeHelperTool.isHoming()){
					GCodeHelperTool.send("?")	
				}
			}, GCodeHelperTool.STATUS_INTERVAL);
		}
		else if(line.match(/(<(IDLE|HOLD|RUN|HOMING|JOG|ALARM|DOOR),(MPos\:([-+]?\d*\.?\d*),([-+]?\d*\.?\d*),([-+]?\d*\.?\d*)),(WPos\:([-+]?\d*\.?\d*),([-+]?\d*\.?\d*),([-+]?\d*\.?\d*))>)/gi)){
			[GCodeHelperTool.MACHINE.POS.x, GCodeHelperTool.MACHINE.POS.y] = line.match(/([-+]?\d*\.?\d*)/ig).filter(a => a.length>0);
			if(line.match(/IDLE/gi))		GCodeHelperTool.setState("IDLE");
			else if(line.match(/HOLD/gi))	GCodeHelperTool.setState("HOLD");
			else if(line.match(/RUN/gi))	GCodeHelperTool.setState("RUN");
			else if(line.match(/HOMING/gi))	GCodeHelperTool.setState("HOMING");
			else if(line.match(/JOG/gi))	GCodeHelperTool.setState("JOG");
			else if(line.match(/ALARM/gi))	GCodeHelperTool.setState("ALARM");
			else if(line.match(/DOOR/gi))	GCodeHelperTool.setState("DOOR");
			else 							GCodeHelperTool.setState("ERROR");
		}else if(line.match(/ERROR/gi)){
			GCodeHelperTool.setState("ERROR");
		}else if(line.match(/ALARM/gi)){
			GCodeHelperTool.setState("ALARM");
		}else if(line.match(/OK/gi)){
			GCodeHelperTool.MACHINE.BUFFER_LEN--;
			if(GCodeHelperTool.MACHINE.BUFFER_LEN == 0 ){
				GCodeHelperTool.triger("emptyBuffer");
			}
		}
		if(verbose){
			console.log(`>>`, line);
			console.log(GCodeHelperTool.MACHINE);
		}
	}
	static send(data, verbose=false){
		if(verbose){
			console.log(`<<`, data);
		}
		GCodeHelperTool.serialPort.write(`${data}\n`);
		GCodeHelperTool.MACHINE.BUFFER_LEN++;
	}
	static isRunning(){
		return GCodeHelperTool.MACHINE.STATE == "RUN";
	}
	static isHoming(){
		return GCodeHelperTool.MACHINE.STATE == "HOMING";
	}
}
GCodeHelperTool.serialPort;
GCodeHelperTool.eventHandlers = {};
GCodeHelperTool.STATUS_INTERVAL = 200;
GCodeHelperTool.MACHINE = {
	STATE : undefined,
	POS : {x : 0, y : 0},
	BUFFER_LEN : 0
};

export default class GCodeHelper{
	constructor({serialName, serialBaudrate, verbose}){
		this.serialName = serialName;
		this.serialBaudrate = serialBaudrate;
		this.verbose = verbose;
	}
	run(){
		GCodeHelperTool.serialPort = new SerialPort(
			this.serialName, 
			{ baudRate : this.serialBaudrate }
		);
		GCodeHelperTool.serialPort.on('open',() => {
			if(this.verbose){
				console.log(`Serial Port ${this.serialName} is opened.`);
			}
		});
		const parser = new Readline()
		GCodeHelperTool.serialPort.pipe(parser);
		parser.on('data', (line)=>GCodeHelperTool.receive(line, this.verbose));
		
		GCodeHelperTool.once("IDLE", event => {
			GCodeHelperTool.triger("ready");
		});
		this.run = () => console.log("Run can be launched only once");
	}
	on(eventName, fnc){
		GCodeHelperTool.on(eventName, fnc)
		return this;
	}
	once(eventName, fnc){
		GCodeHelperTool.once(eventName, fnc)
		return this;
	}
	feedHold(){
		this.send(`!`);
		return this;
	}
	send(data){
		GCodeHelperTool.send(data, this.verbose);
		return this;
	}
	goStartPosition(gCodeCommand){//(first line of GCode file)
		GCodeHelperTool.send(gCodeCommand);
		GCodeHelperTool.once(`IDLE`, event => {
			GCodeHelperTool.triger("atStartPoint");
		});
		return this;
	}
	goHome(){
		this.send("$H");
		console.log("GO HOME");
		//GCodeHelperTool.setState("HOMING");
		//GCodeHelperTool.once(`IDLE`, event => {
		//	GCodeHelperTool.triger("atHome");
		//});
		return this;
	}
	isRunning(){
		return GCodeHelperTool.isRunning();
	}
	isHoming(){
		return GCodeHelperTool.isHoming();
	}
	getMachineInfo(){
		return GCodeHelperTool.MACHINE;
	}
}
