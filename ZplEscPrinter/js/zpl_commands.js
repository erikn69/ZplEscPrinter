class ZplCommands {
  constructor(configs = {}) {
    this.configs = configs;
    this.commands = {
      getStatus: '~HS',       // Host Status
      getErrorStatus: '~HQES',// Host Query Error Status
      getInfo: '~HI',         // Host Identification
      getConfig: '~WC',       // Configuration Label
      getDirectory: '~WD',    // Directory listing
      cancelAll: '~JA',       // Cancel All
      printStart: '~PS'       // Print Start
    };
  }

  matchCommand(data) {
    const cmd = data.trim().toUpperCase();
    const match = Object.values(this.commands).find(c => c === cmd);
    if (!match) return false;

    // ~JA and ~PS are action commands (no response data)
    if (cmd === this.commands.cancelAll) {
      return {
        action: (configs, notify) => {
          // Cancel all pending formats/labels
          console.log('~JA: Cancel All - clearing print buffer');
        },
        message: 'All pending formats cancelled',
        response: null
      };
    }

    if (cmd === this.commands.printStart) {
      return {
        action: (configs, notify) => {
          // Resume printing from pause
          if (configs.zplPrinterPaused) {
            configs.zplPrinterPaused = false;
            if (typeof global !== 'undefined' && global.localStorage) {
              global.localStorage.setItem('zplPrinterPaused', 'false');
            }
          }
          console.log('~PS: Print Start - resuming from pause');
        },
        message: 'Printing resumed',
        response: null
      };
    }

    // Other commands return response data
    return true;
  }

  /**
   * Extract all known tilde commands and separate label data from mixed input.
   * Handles cases where multiple commands are concatenated (e.g., "~JA~HS")
   * or commands are mixed with label data (e.g., "^XA...^XZ~HS").
   */
  extractCommands(data) {
    const commandPattern = /~(HQES|HS|HI|WC|WD|JA|PS)/gi;
    const commands = [];
    let match;
    while ((match = commandPattern.exec(data)) !== null) {
      commands.push('~' + match[1].toUpperCase());
    }
    const labelData = data.replace(commandPattern, '').trim();
    return { commands, labelData };
  }

  getResponse(data) {
    const cmd = data.trim().toUpperCase();
    switch (cmd) {
      case this.commands.getStatus:
        return Buffer.from(this.getPrinterStatus(), 'utf8');
      case this.commands.getErrorStatus:
        return Buffer.from(this.getHostQueryErrorStatus(), 'utf8');
      case this.commands.getInfo:
        return Buffer.from(this.getPrinterInfo(), 'utf8');
      case this.commands.getConfig:
        return Buffer.from(this.getPrinterConfig(), 'utf8');
      case this.commands.getDirectory:
        return Buffer.from(this.getPrinterDirectory(), 'utf8');
    }
  }

  _isTruthy(val) {
    return [1, "1", true, "true"].includes(val);
  }

  /**
   * ~HS - Host Status Return
   * Returns 3 comma-separated strings framed with STX/ETX
   *
   * String 1: Communication/general status
   * String 2: Paper/ribbon/head status flags
   * String 3: Additional printer info
   */
  getPrinterStatus() {
    const c = this.configs;
    const t = this._isTruthy.bind(this);

    // String 1: General printer status
    // Fields: comm_settings, paper_out, pause, label_length, formats_in_buffer,
    //         buffer_full, comm_diag_mode, partial_format, unused, corrupt_ram,
    //         under_temp, over_temp
    const paperOut = t(c.zplPaperOut) ? 1 : 0;
    const paused = t(c.zplPrinterPaused) ? 1 : 0;
    const string1 = [
      '030',        // Communication settings (baud/data/stop/parity)
      paperOut,     // Paper out flag
      paused,       // Pause flag
      '0832',       // Label length in dots
      '0',          // Number of formats in receive buffer
      '0',          // Buffer full flag
      '0',          // Communication diagnostics mode
      '0',          // Partial format flag
      '000',        // Unused
      '0',          // Corrupt RAM flag
      t(c.zplHeadTooHot) ? '1' : '0',  // Under/over temperature
      '0'           // Over temperature flag
    ].join(',');

    // String 2: Function/status flags
    // Fields: function_settings, unused, head_up, ribbon_out, thermal_transfer,
    //         print_mode, print_width_mode, label_waiting, labels_remaining,
    //         format_while_printing, graphics_stored
    const headOpen = t(c.zplHeadOpen) ? 1 : 0;
    const ribbonOut = t(c.zplRibbonOut) ? 1 : 0;
    const string2 = [
      '001',        // Function settings
      '0',          // Unused
      headOpen,     // Head up (open) flag
      ribbonOut,    // Ribbon out flag
      '1',          // Thermal transfer mode
      '0',          // Print mode
      '0',          // Print width mode
      '0',          // Label waiting flag
      '0',          // Labels remaining in batch
      '0',          // Format while printing
      '0'           // Number of graphic images stored
    ].join(',');

    // String 3: Additional info
    // Fields: password, static_ram_installed
    const string3 = [
      '0',          // Password
      '0'           // Static RAM installed
    ].join(',');

    return (
      '\x02' + string1 + '\x03\r\n' +
      '\x02' + string2 + '\x03\r\n' +
      '\x02' + string3 + '\x03\r\n'
    );
  }

  /**
   * ~HQES - Host Query Error Status
   * Returns printer status with error and warning bitmask flags.
   *
   * Response format:
   *   STX PRINTER STATUS CR LF
   *       ERRORS: 1 xxxxxxxx xxxxxxxx CR LF
   *       WARNINGS: 1 xxxxxxxx xxxxxxxx CR LF ETX
   *
   * Error flags (second hex group):
   *   Bit 0 (0x01): Media Out
   *   Bit 1 (0x02): Ribbon Out
   *   Bit 2 (0x04): Head Open
   *   Bit 3 (0x08): Cutter Fault
   *   Bit 4 (0x10): Printhead Over-Temperature
   *   Bit 5 (0x20): Motor Over-Temperature
   *   Bit 6 (0x40): Bad Printhead Element
   *   Bit 7 (0x80): Printhead Detection Error
   *
   * Warning flags (second hex group):
   *   Bit 0 (0x01): Need to Calibrate Media
   *   Bit 1 (0x02): Clean Printhead
   *   Bit 2 (0x04): Replace Printhead
   *   Bit 3 (0x08): Paper-near-end Sensor
   */
  getHostQueryErrorStatus() {
    const c = this.configs;
    const t = this._isTruthy.bind(this);

    // Build error flags bitmask
    let errorFlags = 0;
    if (t(c.zplHqesMediaOut))                errorFlags |= 0x00000001;
    if (t(c.zplHqesRibbonOut))               errorFlags |= 0x00000002;
    if (t(c.zplHqesHeadOpen))                errorFlags |= 0x00000004;
    if (t(c.zplHqesCutterFault))             errorFlags |= 0x00000008;
    if (t(c.zplHqesPrintheadOverTemp))       errorFlags |= 0x00000010;
    if (t(c.zplHqesMotorOverTemp))           errorFlags |= 0x00000020;
    if (t(c.zplHqesBadPrintheadElement))     errorFlags |= 0x00000040;
    if (t(c.zplHqesPrintheadDetectionError)) errorFlags |= 0x00000080;

    // Build warning flags bitmask (per Zebra spec)
    let warningFlags = 0;
    if (t(c.zplHqesMediaNearEnd))      warningFlags |= 0x00000008;  // Bit 3: Paper-near-end Sensor
    if (t(c.zplHqesRibbonNearEnd))     warningFlags |= 0x00000001;  // Bit 0: Need to Calibrate Media (reusing for ribbon)
    if (t(c.zplHqesReplacePrinthead))  warningFlags |= 0x00000004;  // Bit 2: Replace Printhead
    if (t(c.zplHqesCleanPrinthead))    warningFlags |= 0x00000002;  // Bit 1: Clean Printhead

    const errHex = errorFlags.toString(16).padStart(8, '0');
    const warnHex = warningFlags.toString(16).padStart(8, '0');

    return (
      '\x02' +
      'PRINTER STATUS\r\n' +
      '    ERRORS: 1 00000000 ' + errHex + '\r\n' +
      '    WARNINGS: 1 00000000 ' + warnHex + '\r\n' +
      '\x03'
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
