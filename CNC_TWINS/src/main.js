#!/usr/bin/env node
/*----------------------------------------*\
  GCODE - main.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-21 17:38:22
  @Last Modified time: 2020-09-22 14:40:16
\*----------------------------------------*/

// Eraser Fail to Homing...
// ok comes just after command send not at move finished



import { program } from 'commander';
import SyncHelper from './SyncHelper.js';
import GCodeHelper from './GCodeHelper.js';
import AirHelper from './AirHelper.js';
import FSHelper from './FSHelper.js';
import SerialPort from "serialport";
import SimplexNoise from 'simplex-noise';
import Rotary from 'raspberrypi-rotary-encoder';

const ROTARY_CK_PIN = 0;
const ROTARY_DT_PIN = 2;
const ROTARY_SWITCH_PIN = 3;  // Optional switch

const AIR_CONTROL_PIN = 7;
const CUT_AIR_RADIUS = 10;
const CENTER_X = -1076;//-1077;//-1071.739;
const CENTER_Y = -602.7;//-588.283;

//const CENTER_X = -1079.0255;//-1071.739;
//const CENTER_Y = -598.4255;//-588.283;


process.title = "CNC_TWINS";

program
	.option('-v, --verbose', 'verbose');

program
	.command('list')
	.description('Get Serial List')
	.action(async ({...options}) => {
		const serialList = await SerialPort.list();
		console.log(serialList);
	});

program
	.command('air')
	.option('-aP, --airPinControl <airPinControl>', 'GPIO pin for air control', AIR_CONTROL_PIN)
	.description('test For Air Helper')
	.action(async ({airPinControl, ...options}) => {
		return new Promise(()=>{
			airPinControl = parseInt(airPinControl);
			const verbose = options.parent.verbose;
			const airHelper = new AirHelper({
				verbose : verbose,
				outputPin : airPinControl
			});	
			let flag = true;
			setInterval(()=>{
				if(flag)airHelper.enable();	
				else airHelper.disable();
				flag = !flag;
			}, 1000);
		});
	});

program
	.command('run')
	.option('-sD, --synchDisabled <synchDisabled>', 'Disabling Sync channel', false)
	.option('-sN, --synchSerialName <synchSerialName>', 'Serial name for Sync channel', "/dev/ttyAMA0")
	.option('-sN, --synchSerialName <synchSerialName>', 'Serial name for Sync channel', "/dev/ttyAMA0")
	.option('-sB, --synchBaudrate <synchBaudrate>', 'Serial baudrate for Sync channel', 115200)
	.option('-sI, --synchInterval <synchInterval>', 'Ping interval for Sync process', 1000)
	
	.option('-gN, --gCodeSerialName <gCodeSerialName>', 'Serial name for GCODE channel', "/dev/ttyACM0")
	.option('-gB, --gCodeBaudrate <gCodeBaudrate>', 'Serial baudrate for GCODE channel', 115200)
	.option('-gFt, --gCodeFeedRateToken <gCodeFeedRateToken>', 'FeedRate TOKEN', "F3000")
	.option('-gFM, --gCodeFeedRateMin <gCodeFeedRateMin>', 'Minimum FeedRate of the machine', 3000)
	.option('-gFM, --gCodeFeedRateMax <gCodeFeedRateMax>', 'Maximum FeedRate of the machine', 3000)
	.option('-gFv, --gCodeFeedRateVariation <gCodeFeedRateVariation>', 'FeedRate variation of the machine', 0.05)
	.option('-gT, --gCodeTimeout <gCodeTimeout>', 'Max duration for a GCODE line to process', 30000)
	.option('-gI, --gCodeFileInput <gCodeFileInput>', 'Path of the GCODE file to send', "~/GCODE/Eraser.nc")
	
	.option('-aD, --airDisabled <airDisabled>', 'Disabling air control', false)
	.option('-aP, --airPinControl <airPinControl>', 'GPIO pin for air control', AIR_CONTROL_PIN)
	.option('-aROIx, --airRegionOfInterestX <airRegionOfInterestX>', 'CENTER Region of interest x', CENTER_X) 
	.option('-aROIy, --airRegionOfInterestY <airRegionOfInterestY>', 'CENTER Region of interest y', CENTER_Y)
	.option('-aROIr, --airRegionOfInterestR <airRegionOfInterestR>', 'Radius Region of interest',  CUT_AIR_RADIUS)
	
	.description('run for perpetuity in sync with another machine')
	.action(({synchDisabled, synchSerialName, synchBaudrate, synchInterval, gCodeSerialName, gCodeBaudrate, gCodeFeedRateToken, gCodeFeedRateMin, gCodeFeedRateMax, gCodeFeedRateVariation, gCodeFileInput, gCodeTimeout, airDisabled, airPinControl, airRegionOfInterestX, airRegionOfInterestY, airRegionOfInterestR, ...options}) => {
		
		synchInterval = parseInt(synchInterval);
		synchBaudrate = parseInt(synchBaudrate);

		gCodeBaudrate = parseInt(gCodeBaudrate);
		gCodeTimeout  = parseInt(gCodeTimeout);
		gCodeFeedRateMin = parseInt(gCodeFeedRateMin);
		gCodeFeedRateMax = parseInt(gCodeFeedRateMax);
		gCodeFeedRateVariation = parseFloat(gCodeFeedRateVariation);
		
		airPinControl = parseInt(airPinControl);
		airRegionOfInterestX = parseFloat(airRegionOfInterestX);
		airRegionOfInterestY = parseFloat(airRegionOfInterestY);
		airRegionOfInterestR = parseFloat(airRegionOfInterestR);

		const verbose = options.parent.verbose;
		const synchEnabled = !synchDisabled;
		const airEnabled = !airDisabled;
		
		let GCODE_TIMEOUT_HANDLER;
		let PING_TIMEOUT_HANDLER;
		let STATE_ID = 0 ; 
		let x = 0;
		let y = 0;

		const simplex = new SimplexNoise();
		const getFeedRate = () => {
			const noise = (xInc=0, yInc=0) => simplex.noise2D(x+=xInc, y+=yInc) * 0.5 + 0.5;
			const lerp = (a, b, t) => a + (b - a) * Math.min(Math.max(t, 0), 1);
			return Math.round(lerp(gCodeFeedRateMin, gCodeFeedRateMax, noise(gCodeFeedRateVariation)));
		}
		const kill = (message, {gCodeHelper=false, syncHelper=false, airHelper=false}) => {
			console.log(message);
			gCodeHelper && gCodeHelper.send("!").off();
			syncHelper && syncHelper.send("!").off();
			airHelper && airHelper.disable();
			setTimeout(process.exit, 500);
		}
		SerialPort.list()
		.then(serialList => {
			const synchSerial = serialList.find(detail => detail.path.includes(synchSerialName));
			const gCodeSerial = serialList.find(detail => detail.path.includes(gCodeSerialName));
			if(synchEnabled && !synchSerial){
				return kill("Unknown Sync terminal", {});
			}
			const syncHelper = synchEnabled && new SyncHelper({
				serialName : synchSerial.path, 
				serialBaudrate : synchBaudrate, 
				pingInterval : synchInterval,
				verbose : verbose
			});
			
			if(!gCodeSerial){
				return kill("Unknown GRBL terminal", {});
			}
			const gCodeHelper = new GCodeHelper({
				serialName : gCodeSerial.path, 
				serialBaudrate : gCodeBaudrate, 
				verbose : verbose
			});

			const airHelper = airEnabled && new AirHelper({
				verbose : verbose,
				regionOfInterest : {
					x : airRegionOfInterestX,
					y : airRegionOfInterestY,
					r : airRegionOfInterestR
				}, 
				outputPin : airPinControl
			});
			if(airHelper){
				const rotary = new Rotary(ROTARY_CK_PIN, ROTARY_DT_PIN, ROTARY_SWITCH_PIN);
				rotary.on("rotate", (delta) => {
					console.log("Rotation :"+delta);
					//CUT_AIR_RADIUS += delta;
					//CENTER_X += delta;
					//CENTER_Y += delta;
				});
				rotary.on("pressed", () => {
					console.log("Rotary switch pressed");
				});
				rotary.on("released", () => {
					console.log("Rotary switch released");
				});
			}

			if(verbose) console.log(`Loading GCodeFile : ${gCodeFileInput}`);
			FSHelper.loadFileInArray(gCodeFileInput)
			.then(GCodeData => {
				if(verbose) console.log(`GCode : `, GCodeData);
				
				const sendLine = () => {
					clearTimeout(GCODE_TIMEOUT_HANDLER);
					GCODE_TIMEOUT_HANDLER = gcodeTimeoutBuilder();
					let line = GCodeData.shift();
					if(line.includes(gCodeFeedRateToken)){
						line = line.replace(gCodeFeedRateToken, `F${getFeedRate()}`);
					}
					gCodeHelper.send(line);
					GCodeData.push(line);
				}
				const pingTimeoutBuilder = () => setTimeout(() => kill("SYNC TIMEOUT", {gCodeHelper, syncHelper, airHelper}), synchInterval*3);
				const gcodeTimeoutBuilder = () => setTimeout(() => kill("GCODE TIMEOUT", {gCodeHelper, syncHelper, airHelper}), gCodeTimeout);
				
				process.on('SIGINT', event => kill("kill requested", {gCodeHelper, syncHelper, airHelper}));
				process.on('exit', 	event => kill("kill requested", {gCodeHelper, syncHelper, airHelper}));
				process.on('SIGUSR1', event => kill("kill requested", {gCodeHelper, syncHelper, airHelper}));
				process.on('SIGUSR2', event => kill("kill requested", {gCodeHelper, syncHelper, airHelper}));
				process.on('uncaughtException', event => kill("kill requested", {gCodeHelper, syncHelper, airHelper}));
				process.on('SIGTERM', event => kill("kill requested", {gCodeHelper, syncHelper, airHelper}));
				
				gCodeHelper
				.on("ALARM", event => kill("ALARM received", {gCodeHelper, syncHelper, airHelper}))
				.on("ERROR", event => kill("ERROR received", {gCodeHelper, syncHelper, airHelper}))
				.once(`ready`, event => {
					STATE_ID ++;
					const action = () => gCodeHelper.goHome();
					synchEnabled ? syncHelper.once("sync", event => action()) : action();
				})
				.once("atHome", event => {
					STATE_ID ++;
					const action = () => gCodeHelper.goStartPosition(GCodeData.shift());
					synchEnabled ? syncHelper.once("sync", event => action()) : action();
				})
				.once("atStartPoint", event => {
					STATE_ID ++;
					const action = () => {
						gCodeHelper.on(`move`, event => airHelper.update(event.machine.POS));
						sendLine();
						gCodeHelper.on("emptyBuffer", event => {
							if(gCodeHelper.isRunning()){
								sendLine();
							}
						});
					}
					synchEnabled ? syncHelper.once("sync", event => action()) : action();
				});

				if(!synchEnabled){
					gCodeHelper.run();
				}else{
					syncHelper
					.on("!", () => kill("KILL ORDERED", {gCodeHelper, airHelper}))
					.on("ready", () => gCodeHelper.run())
					.on("ping", event => {
						syncHelper.send("pong", {
							state : gCodeHelper.getMachineInfo().STATE,
							stateID : STATE_ID
						});
					})
					.on("pong", event => {
						if(event.data.stateID >= STATE_ID){
							syncHelper.triger("sync", event);
						}
						clearTimeout(PING_TIMEOUT_HANDLER);
						PING_TIMEOUT_HANDLER = pingTimeoutBuilder();
					}).run();
				}
			});
		})
		.catch(error => {
			console.log(error);
			process.exit();
		});
	});

program.parse(process.argv);



