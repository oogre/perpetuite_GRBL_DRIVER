/*----------------------------------------*\
  Perpetuite - AirHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-09-15 07:36:15
  @Last Modified time: 2020-09-29 17:07:27
\*----------------------------------------*/


import rpio from "rpio";

export default class AirHelper{
	constructor({verbose, regionOfInterest={}, outputPin}){
		this.verbose = verbose;
		this.outputPin = outputPin;
		rpio.open(outputPin, rpio.OUTPUT, rpio.LOW);
		this.roi = {};
		this.setROI(regionOfInterest);
		this.eventHandlers = {};
	}
	update(position){
		const x = position.x-this.roi.x;
		const y = position.y-this.roi.y;
		const sqDist = x * x + y * y;
		if(this.verbose){
			console.log(`Dist : ${Math.sqrt(sqDist)} : ${this.roi.r}`);
		}
		if( sqDist < this.roi.sqR ){
			this.onInside();
		}else {
			this.onOutside();
		}
	}
	setROI({x=0, y=0, r=0}){
		this.roi.x = x;
		this.roi.y = y;
		this.setRadius(r);
		return this;
	}
	setRadius(r){
		this.roi.r = r;
		this.roi.sqR = this.roi.r * this.roi.r;
		if(this.verbose){
			console.log(`CUT_AIR_RADIUS ${this.getRadius()}`);
		}
	}
	getRadius(){
		return this.roi.r;
	}
	onInside(){
		this.disable();	
		return this;
	}
	onOutside(){
		this.enable();
		return this;
	}
	enable(){
		if(rpio.read(this.outputPin) != rpio.HIGH){
			this.triger("beforeSwitch");
			rpio.write(this.outputPin, rpio.HIGH);
			setTimeout(() => this.triger("afterSwitch"), 100);	
		}
		return this;
	}
	disable(){
		if(rpio.read(this.outputPin) != rpio.LOW){
			this.triger("beforeSwitch");
			rpio.write(this.outputPin, rpio.LOW);
			setTimeout(()=>this.triger("afterSwitch"), 100);
		}
		return this;
	}
	off(){
		this.disable();
		rpio.close(this.outputPin);
		rpio.exit();
	}
	triger(eventName, event={}){
		event.eventName = eventName;
		if(this.verbose){
			//console.log(event);
		}
		(this.eventHandlers[eventName]||[]).map(fnc=>fnc(event));
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
}