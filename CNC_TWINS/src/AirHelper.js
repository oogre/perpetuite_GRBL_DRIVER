/*----------------------------------------*\
  Perpetuite - AirHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-09-15 07:36:15
  @Last Modified time: 2020-09-29 12:59:43
\*----------------------------------------*/


import rpio from "rpio";

export default class AirHelper{
	constructor({verbose, regionOfInterest, outputPin}){
		this.verbose = verbose;
		this.outputPin = outputPin;
		rpio.open(outputPin, rpio.OUTPUT, rpio.LOW);
		this.setROI(regionOfInterest);
		this.isInside = false;
		this.wasInside = false;
	}
	update(position){
		this.wasInside = this.isInside;
		const x = position.x-this.roi.x;
		const y = position.y-this.roi.y;
		const sqDist = x * x + y * y;
		if(this.verbose){
			console.log(`Dist : ${Math.sqrt(sqDist)} : (${position.x}, ${position.y}`);
		}
		if( sqDist < this.roi.sqR ){
			this.isInside = true;
		}else {
			this.isInside = false;
		}
		if(this.isInside && !this.wasInside){
			this.onEnter();
		}
		else if(!this.isInside && this.wasInside){
			this.onLeave();
		}
		if(this.isInside){
			this.onInside();
		}else{
			this.onOutside();
		}
	}
	setROI(regionOfInterest){
		this.roi.x = regionOfInterest.x;
		this.roi.y = regionOfInterest.y;
		this.setRadius(regionOfInterest.r);
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
	onEnter(){
		return this;
	}
	onLeave(){
		return this;
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
		rpio.write(this.outputPin, rpio.HIGH);
		return this;
	}
	disable(){
		rpio.write(this.outputPin, rpio.LOW);
		return this;
	}
	off(){
		this.disable();
		rpio.close(this.outputPin);
		rpio.exit();
	}
}