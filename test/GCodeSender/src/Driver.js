/*----------------------------------------*\
  Perpetuite - driver.js
  @author Evrard Vincent (vincent@ogre.be)
  @Date:   2020-08-07 18:46:29
  @Last Modified time: 2020-08-21 12:48:34
\*----------------------------------------*/

import GRBLHelper from './GRBLHelper.js';
import FSHelper from './FSHelper.js';
import SerialPort from "serialport";

export default class Driver {
	static async SimpleRun({verbose, GCodeFile, SerialName, SerialBaudrate}){
		if(verbose){
			console.log(`Loading GCodeFile : ${GCodeFile}`);
		}
		const GCodeData = await FSHelper.loadFileInArray(GCodeFile);
		if(verbose){
			console.log(`GCode : `, GCodeData);
		}

		try{
			const SerialList = await Driver.GetSerialList();
			const GRBLMicroController = SerialList.find(detail => detail.manufacturer && detail.path.includes(SerialName));
			const helper = new GRBLHelper({
				SerialName : GRBLMicroController.path, 
				SerialBaudrate : SerialBaudrate,
				GCodeData : GCodeData,
				verbose : verbose
			});	
			return new Promise(async (resolve, reject) => {
				const rejection = ()=>reject(new Error("TIMEOUT"));
				const timeoutBuilder = ()=>setTimeout(()=>rejection(), Driver.TIMEOUT_DELAY);
let d = 1;
				helper.on(`ready`, () => {
					helper.sendLine();
					Driver.TIMEOUT_HANDLER = timeoutBuilder();
					helper.sendLine();
					helper.sendLine();
				}).on(`commandDone`, () => {
					clearTimeout(Driver.TIMEOUT_HANDLER);
					helper.sendLine();
					Driver.TIMEOUT_HANDLER = timeoutBuilder();
				}).on(`error`, error => reject(new Error(error)));
			});
		}catch(error){
			throw new Error("Unknown GRBL terminal");
		}
	}
	static async GetSerialList(){
		const list = await SerialPort.list();
		return list;
	}
}
Driver.TIMEOUT_DELAY = 10000;
Driver.TIMEOUT_HANDLER = [];