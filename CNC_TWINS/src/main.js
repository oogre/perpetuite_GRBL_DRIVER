#!/usr/bin/env node
/*----------------------------------------*\
  GCODE - main.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-21 17:38:22
  @Last Modified time: 2020-08-31 15:07:54
\*----------------------------------------*/

// Eraser Fail to Homing...
// ok comes just after command send not at move finished



import { program } from 'commander';
import SyncHelper from './SyncHelper.js';
import GCodeHelper from './GCodeHelper.js';
import FSHelper from './FSHelper.js';
import SerialPort from "serialport";

let GCODE_TIMEOUT_HANDLER;
let PING_TIMEOUT_HANDLER;
let STATE_ID = 0 ; 

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
	.command('run')
	.option('-sD, --synchDisabled <synchDisabled>', 'Disabling Sync channel', false)
	.option('-sN, --synchSerialName <synchSerialName>', 'Serial name for Sync channel', "/dev/ttyAMA0")
	.option('-sN, --synchSerialName <synchSerialName>', 'Serial name for Sync channel', "/dev/ttyAMA0")
	.option('-sB, --synchBaudrate <synchBaudrate>', 'Serial baudrate for Sync channel', 115200)
	.option('-sI, --synchInterval <synchInterval>', 'Ping interval for Sync process', 1000)
	
	.option('-gN, --gCodeSerialName <gCodeSerialName>', 'Serial name for GCODE channel', "/dev/ttyACM0")
	.option('-gB, --gCodeBaudrate <gCodeBaudrate>', 'Serial baudrate for GCODE channel', 115200)
	.option('-gT, --gCodeTimeout <gCodeTimeout>', 'Max duration for a GCODE line to process', 30000)
	.option('-gI, --gCodeFileInput <gCodeFileInput>', 'Path of the GCODE file to send', "~/GCODE/Eraser.nc")
	

	.description('run for perpetuity in sync with another machine')
	.action(({synchDisabled, synchSerialName, synchBaudrate, synchInterval, gCodeSerialName, gCodeBaudrate, gCodeFileInput, gCodeTimeout, ...options}) => {
		const verbose = options.parent.verbose;
		const synchEnabled = !synchDisabled;
		
		synchInterval = parseInt(synchInterval);
		synchBaudrate = parseInt(synchBaudrate);
		gCodeBaudrate = parseInt(gCodeBaudrate);
		gCodeTimeout = parseInt(gCodeTimeout);

		SerialPort.list()
		.then(serialList => {
			const synchSerial = serialList.find(detail => detail.path.includes(synchSerialName));
			const gCodeSerial = serialList.find(detail => detail.path.includes(gCodeSerialName));
			const kill = (message, {gCodeHelper=false, syncHelper=false}) => {
				console.log(message);
				gCodeHelper && gCodeHelper.send("!");
				syncHelper && syncHelper.send("!");
				setTimeout(process.exit, 500);
			}
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

			const pingTimeoutBuilder = () => setTimeout(() => kill("SYNC TIMEOUT", {gCodeHelper, syncHelper}), synchInterval*1.5);
			const gcodeTimeoutBuilder = () => setTimeout(() => kill("GCODE TIMEOUT", {gCodeHelper, syncHelper}), gCodeTimeout);

			if(verbose) console.log(`Loading GCodeFile : ${gCodeFileInput}`);
			FSHelper.loadFileInArray(gCodeFileInput)
			.then(GCodeData => {
				if(verbose) console.log(`GCode : `, GCodeData);
				
				process.on('SIGINT', event => {
  					kill("kill requested", {gCodeHelper, syncHelper})
				});

				gCodeHelper.once(`ready`, event => {
					STATE_ID ++;
					const action = () => gCodeHelper.goHome();
					//const action = () => gCodeHelper.setConfig();
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
						const sendLine = () => {
							clearTimeout(GCODE_TIMEOUT_HANDLER);
							GCODE_TIMEOUT_HANDLER = gcodeTimeoutBuilder();
							const line = GCodeData.shift();
							gCodeHelper.send(line);
							GCodeData.push(line);
						}
						sendLine();
						gCodeHelper.on("emptyBuffer", event => {
							if(gCodeHelper.isRunning()){
								sendLine();
							}
						});
					}
					synchEnabled ? syncHelper.once("sync", event => action()) : action();
				})
				.on("ALARM", event => {
					kill("ALARM received >>> kill", {gCodeHelper, syncHelper})
				})
				.on("ERROR", event => {
					kill("ERROR received >>> kill", {gCodeHelper, syncHelper})
				});
				if(!synchEnabled){
					gCodeHelper.run();
				}else{
					syncHelper.on("ready", () => {
						gCodeHelper.run();
					})
					.on("!", () => {
						kill("KILL ORDERED", {gCodeHelper})
					})
					.on("ping", event => {
						syncHelper.send("pong", {
							state : gCodeHelper.getMachineInfo().STATE,
							stateID : STATE_ID
						});
					})
					.on("pong", event => {
						if(event.data.stateID == STATE_ID){
							console.log("triger ===> sync");
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



