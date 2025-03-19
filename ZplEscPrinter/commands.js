class EscposCommands {
  constructor(configs) {
    this.getStatusCommand = "\u0010\u0004\x01";
    this.getOfflineCauseCommand = "\u0010\u0004\x02";
    this.configs = configs;
  }

  /**
   * @returns {number[]} - The status byte for the escpos printer
   */
  getEscposStatus() {
    let returnBytes = [0x00];
    if (![1, "1", true, "true"].includes(configs.escposOnline)) {
      // Bit 3 set indicates that the printer is offline
      returnBytes[0] |= 0b00001000;
    }
    if ([1, "1", true, "true"].includes(configs.escposPaperFeedPressed)) {
      // Bit 6 set indicates that the paper feed button is pressed
      returnBytes[0] |= 0b01000000;
    }
    return returnBytes;
  }

  getOfflineCause() {
    let returnBytes = [0x00];

    if ([1, "1", true, "true"].includes(configs.escposCoverOpen)) {
      // Bit 2 set indicates that the cover is open
      returnBytes[0] |= 0b00000100;
    }

    if ([1, "1", true, "true"].includes(configs.escposPaperBeingFed)) {
      // Bit 3 set indicates that the paper is being fed by the paper feed button
      returnBytes[0] |= 0b00001000;
    }

    if ([1, "1", true, "true"].includes(configs.escposPaperEnd)) {
      // Bit 5 set indicates that the paper is being fed by the paper feed button
      returnBytes[0] |= 0b00100000;
    }

    if ([1, "1", true, "true"].includes(configs.escposErrorOccurred)) {
      // Bit 6 set indicates that an error has occurred
      returnBytes[0] |= 0b01000000;
    }
  }
}

module.exports = EscposCommands;
