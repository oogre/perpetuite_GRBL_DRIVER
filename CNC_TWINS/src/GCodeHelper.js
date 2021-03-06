/*----------------------------------------*\
  GCODE - gCodeHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-21 19:46:37
  @Last Modified time: 2021-02-01 11:27:05
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
	static off(eventName=false){
		if(eventName === false){
			GCodeHelperTool.eventHandlers = {};
		}else{
			GCodeHelperTool.eventHandlers[eventName] = [];	
		}
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
	static runStatusGrabber(interval=GCodeHelperTool.STATUS_INTERVAL){
		clearInterval(GCodeHelperTool.STATUS_HANDLER);
		if(interval != 0){
			GCodeHelperTool.STATUS_HANDLER = setInterval(() => GCodeHelperTool.send("?"), interval);	
		}
	}
	static receive(line, verbose=false){
		if(line.includes("Grbl")){
			GCodeHelperTool.runStatusGrabber();
		}
		else if(line.match(/(<(IDLE|HOLD|RUN|HOMING|JOG|ALARM|DOOR),(MPos\:([-+]?\d*\.?\d*),([-+]?\d*\.?\d*),([-+]?\d*\.?\d*)),(WPos\:([-+]?\d*\.?\d*),([-+]?\d*\.?\d*),([-+]?\d*\.?\d*))>)/gi)){	
			const pos = line.match(/([-+]?\d*\.?\d*)/ig).filter(a => a.length>0);
			GCodeHelperTool.OLD_POS.x = GCodeHelperTool.MACHINE.POS.x;
			GCodeHelperTool.OLD_POS.y = GCodeHelperTool.MACHINE.POS.y;
			GCodeHelperTool.MACHINE.POS.x = parseFloat(pos[0]);
			GCodeHelperTool.MACHINE.POS.y = parseFloat(pos[1]);
			if(GCodeHelperTool.MACHINE.POS.x != 0 && GCodeHelperTool.MACHINE.POS.Y != 0){
				GCodeHelperTool.MIN_POS.x = Math.min(GCodeHelperTool.MIN_POS.x, GCodeHelperTool.MACHINE.POS.x);
				GCodeHelperTool.MIN_POS.y = Math.min(GCodeHelperTool.MIN_POS.y, GCodeHelperTool.MACHINE.POS.y);
				GCodeHelperTool.MAX_POS.x = Math.max(GCodeHelperTool.MAX_POS.x, GCodeHelperTool.MACHINE.POS.x);
				GCodeHelperTool.MAX_POS.y = Math.max(GCodeHelperTool.MAX_POS.y, GCodeHelperTool.MACHINE.POS.y);
			}
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
			GCodeHelperTool.MACHINE.BUFFER_LEN = Math.max(0, GCodeHelperTool.MACHINE.BUFFER_LEN);
			if(GCodeHelperTool.MACHINE.BUFFER_LEN == 0 ){
				GCodeHelperTool.triger("emptyBuffer");
			}
		}
		if(verbose){
			//console.log(`>>`, line);
			//console.log(`CENTER : ${(GCodeHelperTool.MIN_POS.x + GCodeHelperTool.MAX_POS.x)/2}, ${(GCodeHelperTool.MIN_POS.y + GCodeHelperTool.MAX_POS.y)/2}`);
		}
		if( GCodeHelperTool.OLD_POS.x != GCodeHelperTool.MACHINE.POS.x || 
			GCodeHelperTool.OLD_POS.y != GCodeHelperTool.MACHINE.POS.y
		){
			GCodeHelperTool.OLD_POS.x = GCodeHelperTool.MACHINE.POS.x;
			GCodeHelperTool.OLD_POS.y = GCodeHelperTool.MACHINE.POS.y;
			GCodeHelperTool.triger("move");
		}
	}
	static send(data, verbose=false){
		if(verbose){
			//console.log(`GCodeHelper : <<`, data);
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
GCodeHelperTool.STATUS_INTERVAL = 250;
GCodeHelperTool.STATUS_HANDLER;
GCodeHelperTool.MACHINE = {
	STATE : undefined,
	POS : { x : 0, y : 0 },
	BUFFER_LEN : 0
};
GCodeHelperTool.OLD_POS = {x : 0, y : 0};
GCodeHelperTool.MIN_POS = {x : 10000, y : 10000};
GCodeHelperTool.MAX_POS = {x : -10000, y : -10000};

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
	off(eventName){
		GCodeHelperTool.off(eventName);
		return this;
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
	getConfig(){
		GCodeHelperTool.runStatusGrabber(0);
		this.send(`$$`);
		return this;
	}
	setConfig(){
		GCodeHelperTool.runStatusGrabber(0);
		this.send(`$20=1`);
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
		GCodeHelperTool.setState("HOMING");
		GCodeHelperTool.runStatusGrabber(GCodeHelperTool.STATUS_INTERVAL * 10);
		GCodeHelperTool.once(`IDLE`, event => {
			GCodeHelperTool.runStatusGrabber();
			GCodeHelperTool.triger("atHome");
		});
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
	getMachinePos(){
		return GCodeHelperTool.MACHINE.POS;
	}
}
