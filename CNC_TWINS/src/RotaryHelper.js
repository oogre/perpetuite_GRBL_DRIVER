/*----------------------------------------*\
  BeatStepProMidi - RotaryHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-09-24 14:10:41
  @Last Modified time: 2020-09-24 14:17:33
\*----------------------------------------*/

import rpio from "rpio";

export default class RotaryHelper{
	constructor({verbose, rotary}){
		this.verbose = verbose;
		this.rotary = rotary;
		rpio.open(rotary.clockPin, rpio.INPUT);
		rpio.open(rotary.dataPin, rpio.INPUT);
		rpio.open(rotary.switchPin, rpio.INPUT);
		rpio.poll(rotary.clockPin, ()=>{
			this.triger('rotation', {
				direction : (rpio.read(rotary.dataPin) * 2) - 1
			});
		}, rpio.POLL_HIGH);
		rpio.poll(rotary.switchPin, ()=>{
			this.triger('press');
		}, rpio.POLL_HIGH);
		rpio.poll(rotary.switchPin, ()=>{
			this.triger('release');
		}, rpio.POLL_LOW);
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