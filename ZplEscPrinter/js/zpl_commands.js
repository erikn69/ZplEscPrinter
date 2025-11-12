class ZplCommands {
  constructor(configs = {}) {
    this.configs = configs;
    this.commands = {
      getStatus: '~HS',     // Host Status
      getInfo: '~HI',       // Host Identification
      getConfig: '~WC',     // Configuration Label
      getDirectory: '~WD'   // Directory listing
    };
  }

  matchCommand(data) {
    return Object.values(this.commands).includes(data.trim().toUpperCase());
  }

  getResponse(data) {
    const cmd = data.trim().toUpperCase();
    switch (cmd) {
      case this.commands.getStatus:
        return Buffer.from(this.getPrinterStatus(), 'utf8');
      case this.commands.getInfo:
        return Buffer.from(this.getPrinterInfo(), 'utf8');
      case this.commands.getConfig:
        return Buffer.from(this.getPrinterConfig(), 'utf8');
      case this.commands.getDirectory:
        return Buffer.from(this.getPrinterDirectory(), 'utf8');
    }
  }

  getPrinterStatus() {
    const string1 = '100,111,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0';
    const string3 = '24,100,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0';
    const string2Arr = new Array(32).fill(0);
    string2Arr[0] = [1, "1", true, "true"].includes(this.configs.zplHeadOpen) ? 1 : 0;
    string2Arr[1] = [1, "1", true, "true"].includes(this.configs.zplPaperOut) ? 1 : 0;
    string2Arr[2] = [1, "1", true, "true"].includes(this.configs.zplRibbonOut) ? 1 : 0;
    string2Arr[3] = [1, "1", true, "true"].includes(this.configs.zplCutterFault) ? 1 : 0;
    string2Arr[4] = [1, "1", true, "true"].includes(this.configs.zplHeadTooHot) ? 1 : 0;
    string2Arr[5] = [1, "1", true, "true"].includes(this.configs.zplMotorOverheat) ? 1 : 0;
    string2Arr[6] = [1, "1", true, "true"].includes(this.configs.zplPrintheadFault) ? 1 : 0;
    string2Arr[7] = [1, "1", true, "true"].includes(this.configs.zplPrinterPaused) ? 1 : 0;
    string2Arr[8] = [1, "1", true, "true"].includes(this.configs.zplRewindFault) ? 1 : 0;
    string2Arr[9] = [1, "1", true, "true"].includes(this.configs.zplPaperJam) ? 1 : 0;

    return (
      '\x02' + string1 + '\x03\r\n' +
      '\x02' + string2Arr.join(',') + '\x03\r\n' +
      '\x02' + string3 + '\x03\r\n'
    );
  }

  getPrinterInfo() {
    return (
      '\x02EN SYSTEMS CORP.\x03\r\n' +
      '\x02ZEBRA ' + this.configs.density + 'dpmm EMULATOR\x03\r\n' +
      '\x02FIRMWARE' + (this.configs.version||'') + ' (JS EMULATOR)\x03\r\n'
    );
  }

  getPrinterConfig() {
    return '^XA^MMT^PR5,5,5^MD0^LH0,0^JMA^XZ';
  }

  getPrinterDirectory() {
    return (
      '\x02R:FILE1.ZPL,1024\r\n' +
      'R:LABEL.ZPL,512\r\n' +
      'R:LOGO.GRF,8192\r\n\x03\r\n'
    );
  }
}

module.exports = ZplCommands;
