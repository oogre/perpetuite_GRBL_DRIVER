#!/usr/bin/env node
/*----------------------------------------*\
  GCODE - main.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-21 17:38:22
  @Last Modified time: 2020-08-22 17:19:01
\*----------------------------------------*/

import { program } from 'commander';
import SyncHelper from './SyncHelper.js';
import GCodeHelper from './GCodeHelper.js';
import FSHelper from './FSHelper.js';
import SerialPort from "serialport";

let TIMEOUT_DELAY = 10000;
let TIMEOUT_HANDLER;
let PING_TIMEOUT_HANDLER;
let GCODE_READY = false;
let IS_RUNNING = false;

const kill = (message, {gCodeHelper, syncHelper}) => {
	console.log(message);
	gCodeHelper && gCodeHelper.send("!");
	syncHelper && syncHelper.send("!");
	setTimeout(process.exit, 500);
}

program
	.option('-v, --verbose', 'verbose');


program
	.command('run')
	.option('-sN, --synchSerialName <synchSerialName>', 'Serial name for Sync channel', "/dev/ttyAMA0")
	.option('-sB, --synchBaudrate <synchBaudrate>', 'Serial baudrate for Sync channel', 115200)
	
	.option('-gN, --gCodeSerialName <gCodeSerialName>', 'Serial name for GCODE channel', "/dev/ttyACM0")
	.option('-gB, --gCodeBaudrate <gCodeBaudrate>', 'Serial baudrate for GCODE channel', 115200)
	
	.option('-i, --gCodeFileInput <gCodeFileInput>', 'Path of the GCODE file to send', "~/GCODE/Eraser.nc")
	.option('-t, --gCodeTimeout <gCodeTimeout>', 'Timeout to process each GCODE line', 30000)

	.description('run for perpetuity in sync with another machine')
	.action(({synchSerialName, synchBaudrate, gCodeSerialName, gCodeBaudrate, gCodeFileInput, gCodeTimeout, ...options}) => {
		synchBaudrate = parseInt(synchBaudrate);
		gCodeBaudrate = parseInt(gCodeBaudrate);
		TIMEOUT_DELAY = parseInt(gCodeTimeout);

		SerialPort.list()
		.then(serialList => {
			const verbose = options.parent.verbose;
			const synchSerial = serialList.find(detail => detail.path.includes(synchSerialName));
			const gCodeSerial = serialList.find(detail => detail.path.includes(gCodeSerialName));
			if(!synchSerial){
				return kill("Unknown Sync terminal");
			}
			const syncHelper = new SyncHelper({
				serialName : synchSerial.path, 
				serialBaudrate : synchBaudrate, 
				verbose : verbose
			});
			if(!gCodeSerial){
				return kill("Unknown GRBL terminal");
			}
			const gCodeHelper = new GCodeHelper({
				serialName : gCodeSerial.path, 
				serialBaudrate : gCodeBaudrate, 
				verbose : verbose
			});

			if(verbose) console.log(`Loading GCodeFile : ${gCodeFileInput}`);
			FSHelper.loadFileInArray(gCodeFileInput)
			.then(GCodeData => {
				if(verbose) console.log(`GCode : `, GCodeData);
				const pingTimeoutBuilder = () => setTimeout(() => kill("SYNC TIMEOUT", {gCodeHelper, syncHelper}), syncHelper.PING_INTERVAL*1.5);
				const timeoutBuilder = () => setTimeout(() => kill("GCODE TIMEOUT", {gCodeHelper, syncHelper}), TIMEOUT_DELAY);
				const sendLine = () => {
					const line = GCodeData.shift();
					gCodeHelper.send(line);
					GCodeData.push(line);
				}

				process.on('SIGINT', () => {
  					kill("kill requested", {gCodeHelper, syncHelper})
				});

				gCodeHelper.on(`ready`, () => {
					GCODE_READY = true;
				})
				.on(`commandDone`, () => {
					console.log("commandDone");
					//clearTimeout(TIMEOUT_HANDLER);
					//sendLine();
					//TIMEOUT_HANDLER = timeoutBuilder();
				})
				.on(`error`, error => kill(error, {gCodeHelper, syncHelper}))
				.on(`alarm`, error => kill(error, {gCodeHelper, syncHelper}));
				
				syncHelper.on("ready", () => {
					gCodeHelper.run();
				})
				.on("!", () => {
					kill("KILL ORDERED", {gCodeHelper})
				})
				.on("ping", data => {
					if(GCODE_READY){
						syncHelper.send("pong");
					}
				})
				.on("pong", data => {
					if(GCODE_READY && !IS_RUNNING){
						IS_RUNNING = true;
						console.log("RUN");
						//sendLine();
						gCodeHelper.send("G28");
						//TIMEOUT_HANDLER = timeoutBuilder();
						//sendLine();
						//sendLine();
					}
					clearTimeout(PING_TIMEOUT_HANDLER);
					PING_TIMEOUT_HANDLER = pingTimeoutBuilder();
				}).run();
			});
		})
		.catch(error => {
			console.log(error);
			process.exit();
		});
	});

program
	.command('list')
	.description('Get Serial List')
	.action(async ({...options}) => {
		const serialList = await SerialPort.list();
		console.log(serialList);
	});


program.parse(process.argv);



