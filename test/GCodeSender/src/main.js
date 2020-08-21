#!/usr/bin/env node
/*----------------------------------------*\
  Perpetuite - main.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-06 18:18:18
  @Last Modified time: 2020-08-21 12:41:05
\*----------------------------------------*/

import { program } from 'commander';
import Driver from './Driver.js';

program
	.option('-v, --verbose', 'verbose');

program
	.command('loop')
	.option('-i, --input <input>', 'Path of the GCODE file to send')
	.option('-t, --timeout <timeout>', 'Timeout to process each GCODE line', 30000)
	.option('-o, --output <output>', 'Serial name of GRBL Micro-Controller')
	.option('-b, --baudrate <baudrate>', 'Serial baudrate', 115200)
	.description('run for perpetuity')
	.action(({input, output, baudrate, timeout, ...options}) => {
		Driver.TIMEOUT_DELAY = timeout;
		Driver.SimpleRun({
			GCodeFile : input, 
			SerialName : output,
			SerialBaudrate : baudrate,
			verbose : options.parent.verbose
		}).catch(e=>{
			console.log(e);
			process.exit();
		});
	});

program
	.command('list')
	.description('Get Serial List')
	.action(async ({...options}) => {
		const SerialList = await Driver.GetSerialList();
		console.log(SerialList);
	});




program.parse(process.argv);



