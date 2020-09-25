/*----------------------------------------*\
  BeatStepProMidi - RotaryHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-09-24 14:10:41
  @Last Modified time: 2020-09-25 10:24:49
\*----------------------------------------*/

import rpio from "rpio";

export default class RotaryHelper{
	constructor({verbose, rotary}){
		this.verbose = verbose;
		this.rotary = rotary;
		rpio.open(rotary.clockPin, rpio.INPUT, rpio.PULL_DOWN);
		rpio.open(rotary.dataPin, rpio.INPUT, rpio.PULL_DOWN);
		rpio.open(rotary.switchPin, rpio.INPUT, rpio.PULL_DOWN);



		rpio.poll(rotary.clockPin, ()=>{
			console.log("rotary.clockPin : ", rotary.clockPin, rpio.read(rotary.clockPin))
			//this.triger('rotation', { direction : (rpio.read(rotary.dataPin) * 2) - 1 });
		}, rpio.POLL_BOTH);

		



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
		this.disable();
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