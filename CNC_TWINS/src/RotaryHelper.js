/*----------------------------------------*\
  BeatStepProMidi - RotaryHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-09-24 14:10:41
  @Last Modified time: 2020-09-29 16:49:18
\*----------------------------------------*/

import rpio from "rpio";

export default class RotaryHelper{
	constructor({verbose, rotary}){
		this.verbose = verbose;
		this.rotary = rotary;
		this._enable = true;
		rpio.open(rotary.clockPin, rpio.INPUT);
		rpio.open(rotary.dataPin, rpio.INPUT);
		rpio.open(rotary.switchPin, rpio.INPUT, rpio.PULL_UP);
		this.releaseFlag = false;
		rpio.poll(rotary.switchPin, ()=>{
			const sw = rpio.read(rotary.switchPin);
			if(sw){
				if(!this.releaseFlag){
					this.releaseFlag = true;
					return;
				}
				this.triger('release');	
			}else{
				this.triger('press');
			}
		}, rpio.POLL_BOTH);
		
		rpio.poll(rotary.clockPin, ()=>{
			const cl = rpio.read(rotary.clockPin);
			const dt = rpio.read(rotary.dataPin);
			if(cl != dt){
				this.triger('rotation', { direction : -1});
			}else if(cl && dt){
				this.triger('rotation', { direction : 1});
			}
		}, rpio.POLL_HIGH);

		
		this.eventHandlers = {};
	}
	kill(){
		this.off();
		rpio.close(this.rotary.clockPin);
		rpio.close(this.rotary.dataPin);
		rpio.close(this.rotary.switchPin);
		rpio.exit();
	}
	disable(){
		this._enable = false;
	}
	enable(){
		this._enable = true;	
	}
	triger(eventName, event={}){
		if(!this._enable)return;
		
		event.eventName = eventName;
		if(this.verbose){
			console.log(event);
		}
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