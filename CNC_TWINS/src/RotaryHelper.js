/*----------------------------------------*\
  BeatStepProMidi - RotaryHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-09-24 14:10:41
  @Last Modified time: 2020-09-25 12:03:47
\*----------------------------------------*/

import rpio from "rpio";

export default class RotaryHelper{
	constructor({verbose, rotary}){
		this.verbose = verbose;
		this.rotary = rotary;
		console.log(rotary);
		console.log(rotary.clockPin);
		rpio.open(rotary.clockPin, rpio.INPUT);
		console.log(rotary.dataPin);
		rpio.open(rotary.dataPin, rpio.INPUT);
		console.log(rotary.switchPin);
		rpio.open(rotary.switchPin, rpio.INPUT);

		rpio.poll(rotary.clockPin, ()=>{
			console.log("rpio.read(rotary.clockPin) : ", rpio.read(rotary.clockPin));
			console.log("rpio.read(rotary.dataPin) : ", rpio.read(rotary.dataPin));
			//this.triger('rotation', { direction : ((dtState) * 2) - 1 });
		}, rpio.POLL_HIGH);

		this.switchIsPressed = false;
		/*
		rpio.poll(rotary.switchPin, ()=>{
			this.switchIsPressed = !this.switchIsPressed
			if(this.switchIsPressed){
				this.triger('press');	
			}else{
				this.triger('release');
			}
		}, rpio.POLL_BOTH);
		*/
		this.eventHandlers = {};
	}
	kill(){
		this.off();
		rpio.close(this.rotary.clockPin);
		rpio.close(this.rotary.dataPin);
		rpio.close(this.rotary.switchPin);
		rpio.exit();
	}
	triger(eventName, event={}){
		event.eventName = eventName;
		(this.eventHandlers[eventName]||[]).map(fnc=>fnc(event));
		return this;
	}
	on(eventName, fnc){
		this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
		this.eventHandlers[eventName].push(fnc);
		return this;
	}
	off(eventName=false){
		if(eventName===false){
			this.eventHandlers = {};	
		}else{
			this.eventHandlers[eventName]=[];	
		}
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
}