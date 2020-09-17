/*----------------------------------------*\
  Perpetuite - AirHelper.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-09-15 07:36:15
  @Last Modified time: 2020-09-17 14:04:52
\*----------------------------------------*/


import rpio from "rpio";

export default class AirHelper{
	constructor({verbose, regionOfInterest, outputPin}){
		this.verbose = verbose;
		this.outputPin = outputPin;
		rpio.open(outputPin, rpio.OUTPUT, rpio.LOW);
		this.roi = regionOfInterest;
		this.isInside = false;
		this.wasInside = false;
	}
	update(position){
		this.wasInside = this.isInside;
		if( position.x > this.roi.x1 && 
			position.x < this.roi.x2 &&  
			position.y > this.roi.y1 &&  
			position.y < this.roi.y2 
		){
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
			if(this.verbose){
				console.log(`AirHelper : inside`);
			}
		}else{
			this.onOutside();
			if(this.verbose){
				console.log(`AirHelper : outside`);
			}
		}
	};
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