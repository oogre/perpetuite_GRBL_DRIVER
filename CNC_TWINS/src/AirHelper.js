/*----------------------------------------*\
  Perpetuite - AirHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-09-15 07:36:15
  @Last Modified time: 2020-09-22 15:07:31
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
		const dist = x * x + y * y;
		if(this.verbose){
			console.log(`Dist : ${Math.sqrt(dist)} : (${x}, ${y}`);
		}
		if( dist < this.roi.sqR ){
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
		this.roi = regionOfInterest;
		this.roi.sqR = this.roi.r * this.roi.r;
	}
	onEnter(){

	}
	onLeave(){

	}
	onInside(){
		this.disable();	
	}
	onOutside(){
		this.enable();
	}
	enable(){
		rpio.write(this.outputPin, rpio.HIGH);
	}
	disable(){
		rpio.write(this.outputPin, rpio.LOW);
	}
}