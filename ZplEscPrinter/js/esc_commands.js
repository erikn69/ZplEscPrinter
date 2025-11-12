class EscposCommands {
  constructor(configs) {
    this.configs = configs;
    this.commands = {
        getStatusCommand: "\u0010\u0004\x01",
        getOfflineCauseCommand: "\u0010\u0004\x02",
        getErrorCauseCommand: "\u0010\u0004\x02",
        getRollPaperStatusCommand: "\u0010\u0004\x04",
    };
  }

  matchCommand(data) {
    return Object.values(this.commands).includes(data);
  }

  getResponse(data) {
    switch (data) {
      case this.commands.getStatusCommand:
        return Buffer.from(this.getEscposStatus());
      case this.commands.getOfflineCauseCommand:
        return Buffer.from(this.getOfflineCause());
      case this.commands.getErrorCauseCommand:
        return Buffer.from(this.getErrorCause());
      case this.commands.getRollPaperStatusCommand:
        return Buffer.from(this.getRollPaperStatus());
    }
  }

  /**
   * @returns {number[]} - The status byte for the escpos printer
   */
  getEscposStatus() {
    let returnBytes = [0x00];
    if (![1, "1", true, "true"].includes(this.configs.escposOnline)) {
      // Bit 3 set indicates that the printer is offline
      returnBytes[0] |= 0b00001000;
    }
    if ([1, "1", true, "true"].includes(this.configs.escposPaperFeedPressed)) {
      // Bit 6 set indicates that the paper feed button is pressed
      returnBytes[0] |= 0b01000000;
    }

    return returnBytes;
  }

  getOfflineCause() {
    let returnBytes = [0x00];

    if ([1, "1", true, "true"].includes(this.configs.escposCoverOpen)) {
      // Bit 2 set indicates that the cover is open
      returnBytes[0] |= 0b00000100;
    }

    if ([1, "1", true, "true"].includes(this.configs.escposPaperBeingFed)) {
      // Bit 3 set indicates that the paper is being fed by the paper feed button
      returnBytes[0] |= 0b00001000;
    }

    if ([1, "1", true, "true"].includes(this.configs.escposPaperEnd)) {
      // Bit 5 set indicates that the paper is being fed by the paper feed button
      returnBytes[0] |= 0b00100000;
    }

    if ([1, "1", true, "true"].includes(this.configs.escposErrorOccurred)) {
      // Bit 6 set indicates that an error has occurred
      returnBytes[0] |= 0b01000000;
    }

    return returnBytes;
  }

  getErrorCause() {
    let returnBytes = [0x00];

    if ([1, "1", true, "true"].includes(this.configs.escposRecoverableError)) {
      // Bit 2 set indicates that a recoverable error has occurred
      returnBytes[0] |= 0b00000100;
    }

    if ([1, "1", true, "true"].includes(this.configs.escposCutterError)) {
      // Bit 3 set indicates that an auto cutter error has occurred
      returnBytes[0] |= 0b00001000;
    }

    if ([1, "1", true, "true"].includes(this.configs.escposUnrecoverableError)) {
      // Bit 5 set indicates that an unrecoverable error has occurred
      returnBytes[0] |= 0b00100000;
    }

    if ([1, "1", true, "true"].includes(this.configs.escposAutoRecoverableError)) {
      // Bit 6 set indicates that an auto recoverable error has occurred
      returnBytes[0] |= 0b01000000;
    }

    return returnBytes;
  }

  getRollPaperStatus() {
    let returnBytes = [0x00];

    if ([1, "1", true, "true"].includes(this.configs.escposPaperLow)) {
      // Bit 6 set indicates that the paper is low
      returnBytes[0] |= 0b00001100;
    }

    return returnBytes;
  }
}

module.exports = EscposCommands;
