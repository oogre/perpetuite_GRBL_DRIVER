#!/usr/bin/env node
/*----------------------------------------*\
  GCODE - main.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-21 17:38:22
  @Last Modified time: 2020-08-22 00:20:33
\*----------------------------------------*/

import { program } from 'commander';
import SyncHelper from './SyncHelper.js';
import GCodeHelper from './GCodeHelper.js';
import FSHelper from './FSHelper.js';
import SerialPort from "serialport";

let TIMEOUT_DELAY = 10000;
let TIMEOUT_HANDLER = [];

program
	.option('-v, --verbose', 'verbose');

program
	.command('run')
	.option('-sN, --synchSerialName <synchSerialName>', 'Serial name for Sync channel', "/dev/ttyAMA0")
	.option('-sB, --synchBaudrate <synchBaudrate>', 'Serial baudrate for Sync channel', 115200)
	
	.option('-gN, --gCodeSerialName <gCodeSerialName>', 'Serial name for GCODE channel', "/dev/ttyACM0")
	.option('-gB, --gCodeBaudrate <gCodeBaudrate>', 'Serial baudrate for GCODE channel', 115200)
	
	.option('-i, --gCodeFileInput <gCodeFileInput>', 'Path of the GCODE file to send')
	.option('-t, --gCodeTimeout <gCodeTimeout>', 'Timeout to process each GCODE line', 30000)

	.description('run for perpetuity in sync with another machine')
	.action(({synchSerialName, synchBaudrate, gCodeSerialName, gCodeBaudrate, gCodeFileInput, gCodeTimeout, ...options}) => {
		synchBaudrate = parseInt(synchBaudrate);
		gCodeBaudrate = parseInt(gCodeBaudrate);
		TIMEOUT_DELAY = parseInt(gCodeTimeout);

		SerialPort.list().then(serialList => {
			const verbose = options.parent.verbose;
			const synchSerial = serialList.find(detail => detail.path.includes(synchSerialName));
			const gCodeSerial = serialList.find(detail => detail.path.includes(gCodeSerialName));
			if(!synchSerial){
				throw new Error("Unknown Sync terminal");
			}	
			if(!gCodeSerial){
				throw new Error("Unknown GRBL terminal");
			}	

			if(verbose) console.log(`Loading GCodeFile : ${gCodeFileInput}`);
			FSHelper.loadFileInArray(gCodeFileInput).then(GCodeData => {
			if(verbose) console.log(`GCode : `, GCodeData);

			const syncHelper = new SyncHelper({
				serialName : synchSerial.path, 
				serialBaudrate : synchBaudrate, 
				verbose : verbose
			});

			const gCodeHelper = new GCodeHelper({
				serialName : gCodeSerial.path, 
				serialBaudrate : gCodeBaudrate, 
				verbose : verbose
			});

			const sendLine = ()=>{
				const line = GCodeData.shift();
				gCodeHelper.send(line);
				GCodeData.push(line);
			}

			const rejection = ()=> console.log(new Error("TIMEOUT"));
			const timeoutBuilder = ()=>setTimeout(()=>rejection(), TIMEOUT_DELAY);
				
			gCodeHelper.on(`ready`, () => {
				sendLine();
				TIMEOUT_HANDLER = timeoutBuilder();
				sendLine();
				sendLine();
			}).on(`commandDone`, () => {
				syncHelper.send("ping");
				clearTimeout(TIMEOUT_HANDLER);
				sendLine();
				TIMEOUT_HANDLER = timeoutBuilder();
			}).on(`error`, error => console.log(new Error(error)));
			
			syncHelper.on("handShake", data => {
				gCodeHelper.init().catch(error=>console.log(error));
			}).on("ping", data => {
				syncHelper.send("pong");
			}).on("pong", data => {
				// SYNC OK
			});
			
			syncHelper.init().then((self)=>{
				self.send("handShake");
			}).catch(error=>console.log(error));;
			
		});
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



