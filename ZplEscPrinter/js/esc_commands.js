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

  _isTruthy(val) {
    return [1, "1", true, "true"].includes(val);
  }

  /**
   * @returns {number[]} - The status byte for the escpos printer
   */
  getEscposStatus() {
    const c = this.configs;
    const t = this._isTruthy.bind(this);
    let returnBytes = [0x00];
    if (!t(c.escposOnline)) {
      // Bit 3 set indicates that the printer is offline
      returnBytes[0] |= 0b00001000;
    }
    if (t(c.escposPaperFeedPressed)) {
      // Bit 6 set indicates that the paper feed button is pressed
      returnBytes[0] |= 0b01000000;
    }

    return returnBytes;
  }

  getOfflineCause() {
    const c = this.configs;
    const t = this._isTruthy.bind(this);
    let returnBytes = [0x00];

    if (t(c.escposCoverOpen)) {
      // Bit 2 set indicates that the cover is open
      returnBytes[0] |= 0b00000100;
    }

    if (t(c.escposPaperBeingFed)) {
      // Bit 3 set indicates that the paper is being fed by the paper feed button
      returnBytes[0] |= 0b00001000;
    }

    if (t(c.escposPaperEnd)) {
      // Bit 5 set indicates that the paper is being fed by the paper feed button
      returnBytes[0] |= 0b00100000;
    }

    if (t(c.escposErrorOccurred)) {
      // Bit 6 set indicates that an error has occurred
      returnBytes[0] |= 0b01000000;
    }

    return returnBytes;
  }

  getErrorCause() {
    const c = this.configs;
    const t = this._isTruthy.bind(this);
    let returnBytes = [0x00];

    if (t(c.escposRecoverableError)) {
      // Bit 2 set indicates that a recoverable error has occurred
      returnBytes[0] |= 0b00000100;
    }

    if (t(c.escposCutterError)) {
      // Bit 3 set indicates that an auto cutter error has occurred
      returnBytes[0] |= 0b00001000;
    }

    if (t(c.escposUnrecoverableError)) {
      // Bit 5 set indicates that an unrecoverable error has occurred
      returnBytes[0] |= 0b00100000;
    }

    if (t(c.escposAutoRecoverableError)) {
      // Bit 6 set indicates that an auto recoverable error has occurred
      returnBytes[0] |= 0b01000000;
    }

    return returnBytes;
  }

  getRollPaperStatus() {
    const c = this.configs;
    const t = this._isTruthy.bind(this);
    let returnBytes = [0x00];

    if (t(c.escposPaperLow)) {
      // Bit 6 set indicates that the paper is low
      returnBytes[0] |= 0b00001100;
    }

    return returnBytes;
  }
}

module.exports = EscposCommands;
