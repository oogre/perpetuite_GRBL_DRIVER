#!/usr/bin/env node
/*----------------------------------------*\
  GCODE - main.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-21 17:38:22
  @Last Modified time: 2021-02-01 11:17:13
\*----------------------------------------*/

// Eraser Fail to Homing...
// ok comes just after command send not at move finished



import { program } from 'commander';
import SyncHelper from './SyncHelper.js';
import GCodeHelper from './GCodeHelper.js';
import AirHelper from './AirHelper.js';
import RotaryHelper from './RotaryHelper.js';
import FSHelper from './FSHelper.js';
import SerialPort from "serialport";
import SimplexNoise from 'simplex-noise';

process.title = "CNC_TWINS";

const GCODE_START_TOKEN = ";(START_OF_DRAWING)";
const libPath = __dirname;
const configPath = `${libPath}/../conf/conf.json`;
const gCODEPath = `${libPath}/../GCODE/${require('os').hostname()}.nc`;


let config = FSHelper.loadJSONFile(configPath);
config.CENTER_X 				= config.CENTER_X || -1069.056;
config.CENTER_Y 				= config.CENTER_Y || -612.939;
config.DEFAULT_CUT_AIR_RADIUS 	= config.DEFAULT_CUT_AIR_RADIUS || 30;
config.CUT_AIR_RADIUS 			= config.CUT_AIR_RADIUS || config.DEFAULT_CUT_AIR_RADIUS;
config.AIR_CONTROL_PIN  		= config.AIR_CONTROL_PIN || 7;
config.ROTARY_CK_PIN			= config.ROTARY_CK_PIN || 16;
config.ROTARY_DT_PIN			= config.ROTARY_DT_PIN || 18;
config.ROTARY_SWITCH_PIN		= config.ROTARY_SWITCH_PIN || 15;
FSHelper.saveJSONFile(config, configPath);
console.log(config);

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
	.option('-aP, --airPinControl <airPinControl>', 'GPIO pin for air control', config.AIR_CONTROL_PIN)
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
				if(flag){
					airHelper.enable();	
				}
				else{
					airHelper.disable();
				}
				flag = !flag;
			}, 1000);
		});
	});


program
	.command('rotary')
	.option('-rC, --rotaryClock <rotaryClock>', 'GPIO pin for rotary clock', config.ROTARY_CK_PIN)
	.option('-rD, --rotaryData <rotaryData>', 'GPIO pin for rotary Data', config.ROTARY_DT_PIN)
	.option('-rS, --rotarySwitch <rotarySwitch>', 'GPIO pin for rotary Switch', config.ROTARY_SWITCH_PIN)
	.description('test For Rotary Helper')
	.action(async ({rotaryClock, rotaryData, rotarySwitch, ...options}) => {
		return new Promise(()=>{
			rotaryClock = parseInt(rotaryClock);
			rotaryData = parseInt(rotaryData);
			rotarySwitch = parseInt(rotarySwitch);

			const verbose = options.parent.verbose;
			const rotaryHelper = new RotaryHelper({
				verbose : verbose,
				rotary : {
					clockPin : rotaryClock,
					dataPin : rotaryData,
					switchPin : rotarySwitch
				}
			});
			
			rotaryHelper.on('rotation', event => {
				console.log(event);
			}).on('press', event => {
				console.log(event);
			}).on('release', event => {
				console.log(event);
			});
		});
	});


program
	.command('air-rotary')
	.option('-aP, --airPinControl <airPinControl>', 'GPIO pin for air control', config.AIR_CONTROL_PIN)
	
	.option('-rC, --rotaryClock <rotaryClock>', 'GPIO pin for rotary clock', config.ROTARY_CK_PIN)
	.option('-rD, --rotaryData <rotaryData>', 'GPIO pin for rotary Data', config.ROTARY_DT_PIN)
	.option('-rS, --rotarySwitch <rotarySwitch>', 'GPIO pin for rotary Switch', config.ROTARY_SWITCH_PIN)
	
	.description('test For Air Helper')
	.action(async ({airPinControl, rotaryClock, rotaryData, rotarySwitch, ...options}) => {
		return new Promise(()=>{
			airPinControl = parseInt(airPinControl);

			rotaryClock = parseInt(rotaryClock);
			rotaryData = parseInt(rotaryData);
			rotarySwitch = parseInt(rotarySwitch);

			const verbose = options.parent.verbose;
			const airHelper = new AirHelper({
				verbose : verbose,
				outputPin : airPinControl
			});	

			const rotaryHelper = new RotaryHelper({
				verbose : verbose,
				rotary : {
					clockPin : rotaryClock,
					dataPin : rotaryData,
					switchPin : rotarySwitch
				}
			});

			airHelper.on("beforeSwitch", event => {
				rotaryHelper.disable();
			}).on("afterSwitch", event => {
				rotaryHelper.enable();
			});
			
			rotaryHelper.on('rotation', event => {
				console.log(event);
			}).on('press', event => {
				console.log(event);
			}).on('release', event => {
				console.log(event);
			});
			
			let flag = true;
			setInterval(()=>{
				if(flag) airHelper.enable();	
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
	
	.option('-gD, --gCodeDisabled <gCodeDisabled>', 'Disabling GCODE semding', false)
	.option('-gN, --gCodeSerialName <gCodeSerialName>', 'Serial name for GCODE channel', "/dev/ttyACM0")
	.option('-gB, --gCodeBaudrate <gCodeBaudrate>', 'Serial baudrate for GCODE channel', 115200)
	.option('-gFt, --gCodeFeedRateToken <gCodeFeedRateToken>', 'FeedRate TOKEN', "F3000")
	.option('-gFM, --gCodeFeedRateMin <gCodeFeedRateMin>', 'Minimum FeedRate of the machine', 2990)
	.option('-gFM, --gCodeFeedRateMax <gCodeFeedRateMax>', 'Maximum FeedRate of the machine', 3010)
	.option('-gFv, --gCodeFeedRateVariation <gCodeFeedRateVariation>', 'FeedRate variation of the machine', 0.05)
	.option('-gT, --gCodeTimeout <gCodeTimeout>', 'Max duration for a GCODE line to process', 30000)
	.option('-gI, --gCodeFileInput <gCodeFileInput>', 'Path of the GCODE file to send', gCODEPath)
	
	.option('-aD, --airDisabled <airDisabled>', 'Disabling air control', false)
	.option('-aP, --airPinControl <airPinControl>', 'GPIO pin for air control', config.AIR_CONTROL_PIN)
	.option('-aROIx, --airRegionOfInterestX <airRegionOfInterestX>', 'CENTER Region of interest x', config.CENTER_X) 
	.option('-aROIy, --airRegionOfInterestY <airRegionOfInterestY>', 'CENTER Region of interest y', config.CENTER_Y)
	.option('-aROIr, --airRegionOfInterestR <airRegionOfInterestR>', 'Radius Region of interest',  config.CUT_AIR_RADIUS)
	
	.option('-rD, --rotaryDisabled <rotaryDisabled>', 'Disabling rotary', false)
	.option('-rC, --rotaryClock <rotaryClock>', 'GPIO pin for rotary clock', config.ROTARY_CK_PIN)
	.option('-rD, --rotaryData <rotaryData>', 'GPIO pin for rotary Data', config.ROTARY_DT_PIN)
	.option('-rS, --rotarySwitch <rotarySwitch>', 'GPIO pin for rotary Switch', config.ROTARY_SWITCH_PIN)
	
	.description('run for perpetuity in sync with another machine')
	.action(({synchDisabled, synchSerialName, synchBaudrate, synchInterval, gCodeDisabled, gCodeSerialName, gCodeBaudrate, gCodeFeedRateToken, gCodeFeedRateMin, gCodeFeedRateMax, gCodeFeedRateVariation, gCodeFileInput, gCodeTimeout, airDisabled, airPinControl, airRegionOfInterestX, airRegionOfInterestY, airRegionOfInterestR, rotaryDisabled, rotaryClock, rotaryData, rotarySwitch, ...options}) => {
		
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

		rotaryClock = parseInt(rotaryClock);
		rotaryData = parseInt(rotaryData);
		rotarySwitch = parseInt(rotarySwitch);

		const verbose = options.parent.verbose;
		const gCodeEnabled = !gCodeDisabled;
		const synchEnabled = !synchDisabled;
		const airEnabled = !airDisabled;
		const rotaryEnabled = !rotaryDisabled;


		let GCODE_TIMEOUT_HANDLER;
		let PING_TIMEOUT_HANDLER;
		let STATE_ID = 0 ; 
		let x = 0;
		let y = 0;
		let t0 = 0; 
		let selfDuration = 0 ; 
		let otherDuration = 0 ; 
		let gCodeFeedRate = Math.round((gCodeFeedRateMin + gCodeFeedRateMax)*0.5);


		
		const kill = (message, {gCodeHelper=false, syncHelper=false, airHelper=false, rotaryHelper=false}) => {
			console.log(message);
			gCodeHelper && gCodeHelper.send("!").off();
			syncHelper && syncHelper.send("!").off();
			airHelper && airHelper.off();
			rotaryHelper && rotaryHelper.kill();
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

			const rotaryHelper = rotaryEnabled && new RotaryHelper({
				verbose : verbose,
				rotary : {
					clockPin : rotaryClock,
					dataPin : rotaryData,
					switchPin : rotarySwitch
				}
			});
			
			if(verbose) console.log(`Loading GCodeFile : ${gCodeFileInput}`);
			FSHelper.loadFileInArray(gCodeFileInput)
			.then(GCodeData => {
				if(verbose) console.log(`GCode : `, GCodeData);
				
				const sendLine = () => {
					if(GCodeData[0] === GCODE_START_TOKEN){
						// CHRONO TAG DETECTED
						console.log("CHRONO TAG DETECTED", GCODE_START_TOKEN);
						GCodeData.push(GCodeData.shift());
						const t = Date.now();
						if(t0 == 0){
							t0 = t;
						}
						selfDuration = t - t0;
						t0 = t;
						if(otherDuration != 0 && selfDuration != 0){
							let dist = otherDuration - selfDuration;
							if(dist != 0){
								//FEEDRATE FITTER
								gCodeFeedRate += dist < 0 ? 1 : -1;	
								//FEEDRATE LIMITER
								gCodeFeedRate = Math.min(gCodeFeedRate, gCodeFeedRateMax);
								gCodeFeedRate = Math.max(gCodeFeedRate, gCodeFeedRateMin);
								console.log("gCodeFeedRate fitted", gCodeFeedRate);
							}
						}
					}
					clearTimeout(GCODE_TIMEOUT_HANDLER);
					GCODE_TIMEOUT_HANDLER = gcodeTimeoutBuilder();
					let line = GCodeData.shift();
					gCodeHelper.send(line.replace(gCodeFeedRateToken, `F${gCodeFeedRate}`));
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
				
				if(gCodeEnabled){
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
						const action = () => {
							let r = gCodeHelper.goStartPosition(GCodeData.shift());
							// PUSH GCODE_START_TOKEN AT FIRST LINE USED AS CHRONO TAG
							GCodeData.unshift(GCODE_START_TOKEN);
							console.log("ADD CHRONO TAG");
						};

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
				}

				if(syncHelper){
					syncHelper
					.on("!", () => kill("KILL ORDERED", {gCodeHelper, airHelper}))
					.on("ready", () => gCodeHelper.run())
					.on("ping", event => {
						syncHelper.send("pong", {
							state : gCodeHelper.getMachineInfo().STATE,
							stateID : STATE_ID,
							duration : selfDuration
						});
					})
					.on("pong", event => {
						if(Number.isInteger(event.data.duration)){
							otherDuration = event.data.duration;	
							console.log("Get Other Duration", otherDuration);
						}else{
							console.log("THERE IS NO DURATION : ", event.data.duration);
						}
						
						if(event.data.stateID >= STATE_ID){
							syncHelper.triger("sync", event);
						}
						clearTimeout(PING_TIMEOUT_HANDLER);
						PING_TIMEOUT_HANDLER = pingTimeoutBuilder();
					}).run();
				}else{
					gCodeHelper.run();
				}
				if(rotaryHelper){
					if(airHelper){
						airHelper.on("beforeSwitch", event => {
							rotaryHelper.disable();
						}).on("afterSwitch", event => {
							rotaryHelper.enable();
						});
					}
					rotaryHelper.on('rotation', event => {
						if(airHelper){
							config.CUT_AIR_RADIUS = airHelper.getRadius() + event.direction*0.25;
							airHelper.setRadius(config.CUT_AIR_RADIUS);
							FSHelper.saveJSONFile(config, configPath);
						}
					})
					.on('release', event => {
						if(airHelper){
							config.CUT_AIR_RADIUS = config.DEFAULT_CUT_AIR_RADIUS;
							airHelper.setRadius(config.CUT_AIR_RADIUS);
							FSHelper.saveJSONFile(config, configPath);
						}
					});
				}
			});
		})
		.catch(error => {
			console.log(error);
			process.exit();
		});
	});

program.parse(process.argv);



