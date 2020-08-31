#!/bin/bash
export PATH=$PATH:/Applications/Arduino.1.8.10.app/Contents/Java/hardware/tools/avr/bin/


/Applications/Arduino.1.8.10.app/Contents/Java/hardware/tools/avr/bin/avrdude -C/Applications/Arduino.1.8.10.app/Contents/Java/hardware/tools/avr/etc/avrdude.conf -v -patmega328p -carduino -P/dev/tty.usbmodem1421 -b115200 -D -Uflash:w:grbl.save.hex:i