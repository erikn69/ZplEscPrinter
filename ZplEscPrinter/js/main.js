const $ = global.$ = global.jQuery = require('jquery');
const createPopper = global.createPopper = require('@popperjs/core');
const Bootstrap = global.Bootstrap = require('bootstrap');
const { ipcRenderer } = require('electron');
const fs = require('fs');;
const net = require('net');

let clientSocketInfo;
let server;
let configs = {};

const defaults = {
    isZpl: true,
    isOn: true,
    density: '8',
    width: '4',
    height: '6',
    unit: '1',
    host: '0.0.0.0',
    port: '9100',
    bufferSize: '4096',
    keepTcpSocket: true,
    saveLabels: false,
    filetype: '3',
    path: null,
    counter: 0
};

$(function () {
    $(window).bind('focus', function () {
        $('#panel-head').removeClass('panel-heading-blur');
    });
    $(window).bind('blur', function () {
        if (document.activeElement && document.activeElement.tagName === 'IFRAME') return;
        $('#panel-head').addClass('panel-heading-blur');
    });
    // todo only on first run
    if (!global.localStorage.getItem('isOn')) {
        Object.entries(defaults).forEach(function ([k, v]) {
            if (global.localStorage.getItem(k)) {
                global.localStorage.setItem(k, v);
            }
        });
    }
});
$(document).ready(function () {
    Object.keys(defaults).forEach(function (k) {
        configs[k] = global.localStorage.getItem(k);
    });

    initEvents();
    initConfigs();
});
function getSize(width, height) {
    const defaultWidth = 386;

    const factor = width / height;
    return {
        width: defaultWidth,
        height: defaultWidth / factor
    };
}
async function saveLabel(blob, ext, counter) {
    const fileName = `LBL${counter.padLeft(6)}.${ext}`;
    const path = !configs.path || configs.path==='null' ? '' : configs.path.trimCharEnd('\\').trimCharEnd('/');

    try {
        fs.writeFileSync(path + '/' + fileName, typeof blob === 'string' ? blob : new Uint8Array(await blob.arrayBuffer()))
        // file written successfully
        notify('Label <b>{0}</b> saved in folder <b>{1}</b>'.format(fileName, path), 'floppy-saved', 'info', 1000);
    } catch (err) {
        console.error(err);
        notify(`error in saving label to ${fileName} ${err.message}`, 'floppy-saved', 'danger', 0);
    }

}
async function fetchAndSavePDF(api_url, zpl, counter) {
    let r1 = await fetch(api_url, {
        method: "POST",
        body: zpl,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/pdf'
        }
    })

    if (!r1.ok || r1.status !== 200) {
        console.log('error in fetching pdf', `status = ${r1.status}`, await r1.text(), `zpl=${zpl}`)
        return
    }

    let blob = await r1.blob()
    await saveLabel(blob, 'pdf', counter);
}
// Display notification
// @param {String} text Notification text
// @param {Number} glyphicon Notification icon
// @param {String} type Notification type
// @param {Number} delay Notification fade out delay in ms
function notify(text, glyphicon, type, delay) {
    const log = $('<p>' + text + '</p>').text();
    if (type === 'danger') {
        console.error(log);
    } else {
        console.info(log);
    }

    let el = $(`<div class="alert alert-${type || 'success'} alert-dismissible fade show position-relative m-1" role="alert">
        <i class="glyphicon glyphicon-${glyphicon || 'info-sign'} float-start" style="font-size: 2em;top:-3px; margin-right: 10px;" aria-hidden="true"></i>
        <span class="msg">${text}<span>
    </div>`).appendTo('.bottom-left');
    setTimeout(function () { el.fadeOut(1000); }, delay || 2000);
}
async function zpl(data){
    try{ data = atob(data.trim()); }catch(e){}
    const zpls = data.split(/\^XZ|\^xz/);
    const factor = configs.unit === '1' ? 1 : (configs.unit === '2' ? 2.54 : (configs.unit === '3' ? 25.4 : 96.5));
    const width = parseFloat(configs.width) / factor;
    const height = Math.round(parseFloat(configs.height) * 1000 / factor) / 1000;

    if (zpls.length > 1 && zpls[zpls.length - 1].trim() === '') {
        zpls.pop();
    }

    for (let zpl of zpls) {
        if (!zpl || !zpl.trim().length) {
            console.warn(`zpl = '${zpl}', seems invalid`);
            continue;
        }

        zpl = zpl.replace(/^\s+/, '') + '^XZ';

        let api_url = atob('aHR0cDovL2FwaS5sYWJlbGFyeS5jb20vdjEvcHJpbnRlcnMvezB9ZHBtbS9sYWJlbHMvezF9eHsyfS8wLw==')
            .format(configs.density, width>15.0 ? 15 : width, height);
        let blob = await displayZplImage(api_url, zpl, width, height);

        if (![1, '1', true, 'true'].includes(configs.saveLabels)) {
            continue;
        }

        console.info("configs", configs.saveLabels, "fileType", configs.filetype);
        let counter = getCounter();
        if (configs.filetype === '1') {
            await saveLabel(blob, "png", counter);
        }
        else if (configs.filetype === '2') {
            await fetchAndSavePDF(api_url, zpl, counter);
        }
        else if (configs.filetype === '3') {
            await saveLabel(zpl, "raw", counter);
        }
    }
}
async function escpos(data,b64){
    let dataAux = data;
    try{ dataAux = base64DecodeUnicode(data.trim()); b64=true; }catch(e){}

    if (!dataAux || !dataAux.trim().length) {
        console.warn(`esc/pos = '${data}', seems invalid`);
        return;
    }

    const factor = configs.unit === '4' ? 1 : (configs.unit === '3' ? 379.921465 : (configs.unit === '2' ? 37.9921465 : 96.5));
    const width = Math.round(parseFloat(configs.width) * factor * 1000) / 1000;

    //console.log(dataAux);
    dataAux = dataAux.replace("\u001B@", '').trim();
    if (!dataAux) { //empty
        await displayEscPosLabel(btoa('<html style="background-color:#f8f8f8;"><head></head><body style="background-color:white;border:1px #dee2e6 solid;"><div style="text-align:center;"><b>--- EMPTY / NO DATA ---</b><br/><br/><div style="width:100px;display:block;margin-left:auto;margin-right:auto;"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 115.19 123.38" style="enable-background:new 0 0 115.19 123.38" xml:space="preserve"><style type="text/css">.st0{fill-rule:evenodd;clip-rule:evenodd;stroke:#000000;stroke-width:0.5;stroke-miterlimit:2.6131;}</style><g><path class="st0" d="M93.13,79.5c12.05,0,21.82,9.77,21.82,21.82c0,12.05-9.77,21.82-21.82,21.82c-12.05,0-21.82-9.77-21.82-21.82 C71.31,89.27,81.08,79.5,93.13,79.5L93.13,79.5z M8.08,0.25h95.28c2.17,0,4.11,0.89,5.53,2.3c1.42,1.42,2.3,3.39,2.3,5.53v70.01 c-2.46-1.91-5.24-3.44-8.25-4.48V9.98c0-0.43-0.16-0.79-0.46-1.05c-0.26-0.26-0.66-0.46-1.05-0.46H9.94 c-0.43,0-0.79,0.16-1.05,0.46C8.63,9.19,8.43,9.58,8.43,9.98v70.02h0.03l31.97-30.61c1.28-1.18,3.29-1.05,4.44,0.23 c0.03,0.03,0.03,0.07,0.07,0.07l26.88,31.8c-4.73,5.18-7.62,12.08-7.62,19.65c0,3.29,0.55,6.45,1.55,9.4H8.08 c-2.17,0-4.11-0.89-5.53-2.3s-2.3-3.39-2.3-5.53V8.08c0-2.17,0.89-4.11,2.3-5.53S5.94,0.25,8.08,0.25L8.08,0.25z M73.98,79.35 l3.71-22.79c0.3-1.71,1.91-2.9,3.62-2.6c0.66,0.1,1.25,0.43,1.71,0.86l17.1,17.97c-2.18-0.52-4.44-0.79-6.78-0.79 C85.91,71.99,79.13,74.77,73.98,79.35L73.98,79.35z M81.98,18.19c3.13,0,5.99,1.28,8.03,3.32c2.07,2.07,3.32,4.9,3.32,8.03 c0,3.13-1.28,5.99-3.32,8.03c-2.07,2.07-4.9,3.32-8.03,3.32c-3.13,0-5.99-1.28-8.03-3.32c-2.07-2.07-3.32-4.9-3.32-8.03 c0-3.13,1.28-5.99,3.32-8.03C76.02,19.44,78.86,18.19,81.98,18.19L81.98,18.19z M85.82,88.05l19.96,21.6 c1.58-2.39,2.5-5.25,2.5-8.33c0-8.36-6.78-15.14-15.14-15.14C90.48,86.17,87.99,86.85,85.82,88.05L85.82,88.05z M100.44,114.58 l-19.96-21.6c-1.58,2.39-2.5,5.25-2.5,8.33c0,8.36,6.78,15.14,15.14,15.14C95.78,116.46,98.27,115.78,100.44,114.58L100.44,114.58z"/></g></svg></div></body><html>'));
    } else if(dataAux.length===5&&(dataAux.startsWith("\u001Bp")||dataAux.startsWith("\u0010\u0014"))) { //pulse
        await displayEscPosLabel(btoa('<html style="background-color:#f8f8f8;"><head></head><body style="background-color:white;border:1px #dee2e6 solid;"><div style="text-align:center;"><b>----- CASH REGISTER PULSE -----</b><br/><br/><div style="width:100px;display:block;margin-left:auto;margin-right:auto;"><svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 490 490" style="enable-background:new 0 0 490 490;" xml:space="preserve"><g><g><g><polygon points="409.1,116.7 367.1,116.7 367.1,87.5 409.1,87.5 409.1,0 262.5,0 262.5,87.5 304.9,87.5 304.9,116.7 79.3,116.7 79.3,206.5 409.1,206.5 "/><path d="M414.9,225.9H75.1L4.3,384.6h481.4L414.9,225.9z M110.4,367.1H76.6c-5.4,0-9.7-4.3-9.7-9.7c0-5.4,4.3-9.7,9.7-9.7h33.8c5.4,0,9.7,4.3,9.7,9.7C120.2,362.8,115.5,367.1,110.4,367.1z M127.6,332.5H98c-5.4,0-9.7-4.3-9.7-9.7s4.3-9.7,9.7-9.7h29.6c5.4,0,9.7,4.3,9.7,9.7S133,332.5,127.6,332.5z M140.8,297.9h-26.1c-5.4,0-9.7-4.3-9.7-9.7s4.3-9.7,9.7-9.7h26.1c5.4,0,9.7,4.3,9.7,9.7S146.2,297.9,140.8,297.9z M151.7,262.9h-23.3c-5.4,0-9.7-4.3-9.7-9.7s4.3-9.7,9.7-9.7h23.3c5.4,0,9.7,4.3,9.7,9.7S157.1,262.9,151.7,262.9z M211.6,367.1h-33.8c-5.4,0-9.7-4.3-9.7-9.7c0-5.4,4.3-9.7,9.7-9.7h33.8c5.4,0,9.7,4.3,9.7,9.7C221.3,362.8,216.6,367.1,211.6,367.1z M215.8,332.5h-29.6c-5.4,0-9.7-4.3-9.7-9.7s4.3-9.7,9.7-9.7h29.6c5.4,0,9.7,4.3,9.7,9.7S220.9,332.5,215.8,332.5z M218.9,297.9h-26.1c-5.4,0-9.7-4.3-9.7-9.7s4.3-9.7,9.7-9.7h26.1c5.4,0,9.7,4.3,9.7,9.7S224.4,297.9,218.9,297.9z M221.7,262.9h-23.3c-5.4,0-9.7-4.3-9.7-9.7s4.3-9.7,9.7-9.7h23.3c5.4,0,9.7,4.3,9.7,9.7S227.1,262.9,221.7,262.9z M268.3,243.4h23.3c5.4,0,9.7,4.3,9.7,9.7s-4.3,9.7-9.7,9.7h-23.3c-5.4,0-9.7-4.3-9.7-9.7S262.9,243.4,268.3,243.4z M261.3,288.2c0-5.4,4.3-9.7,9.7-9.7h26.1c5.4,0,9.7,4.3,9.7,9.7s-4.3,9.7-9.7,9.7H271C265.6,297.9,261.3,293.2,261.3,288.2z M264.4,322.8c0-5.4,4.3-9.7,9.7-9.7h29.6c5.4,0,9.7,4.3,9.7,9.7s-4.3,9.7-9.7,9.7h-29.6C269.1,332.5,264.4,328.2,264.4,322.8z M312.7,367.1h-33.8c-5.4,0-9.7-4.3-9.7-9.7c0-5.4,4.3-9.7,9.7-9.7h33.8c5.4,0,9.7,4.3,9.7,9.7C322.4,362.8,317.7,367.1,312.7,367.1z M328.6,253.2c0-5.4,4.3-9.7,9.7-9.7h23.3c5.4,0,9.7,4.3,9.7,9.7s-4.3,9.7-9.7,9.7h-23.3C332.9,262.9,328.6,258.6,328.6,253.2z M339.5,288.2c0-5.4,4.3-9.7,9.7-9.7h26.1c5.4,0,9.7,4.3,9.7,9.7s-4.3,9.7-9.7,9.7h-26.1C343.8,297.9,339.5,293.2,339.5,288.2z M352.7,322.8c0-5.4,4.3-9.7,9.7-9.7H392c5.4,0,9.7,4.3,9.7,9.7s-4.3,9.7-9.7,9.7h-29.6C357,332.5,352.7,328.2,352.7,322.8z M413.8,367.1H380c-5.4,0-9.7-4.3-9.7-9.7c0-5.4,4.3-9.7,9.7-9.7h33.8c5.4,0,9.7,4.3,9.7,9.7C423.5,362.8,418.8,367.1,413.8,367.1z"/><path d="M0,404.1V490h490v-85.9H0z M245,465.5c-12.8,0-23.3-10.5-23.3-23.3s10.5-23.3,23.3-23.3c12.8,0,23.3,10.5,23.3,23.3S257.8,465.5,245,465.5z"/></g></g></g></svg></div></body><html>'));
    } else if(dataAux.length<=4&&(dataAux.startsWith("\u001DV")||dataAux.startsWith("\u001De")||dataAux.startsWith("\u001Bi"))) { //cut-paper
        await displayEscPosLabel(btoa('<html style="background-color:#f8f8f8;"><head></head><body style="background-color:white;border:1px #dee2e6 solid;"><div style="text-align:center;"><b>-------- PAPER CUT --------</b><br/><br/><div style="width:100px;display:block;margin-left:auto;margin-right:auto;"><svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.1" width="100" height="60" id="svg2"> <defs id="defs4"> <marker refX="0" refY="0" orient="auto" id="Scissors" style="overflow:visible"> <path d="M 9.0898857,-3.6061018 C 8.1198849,-4.7769976 6.3697607,-4.7358294 5.0623558,-4.2327734 l -8.2124046,3.0779029 c -2.3882933,-1.3067135 -4.7482873,-0.9325372 -4.7482873,-1.5687873 0,-0.4973164 0.4566662,-0.3883222 0.3883068,-1.6831941 -0.065635,-1.2432767 -1.3635771,-2.1630796 -2.5903987,-2.0816435 -1.227271,-0.00735 -2.499439,0.9331613 -2.510341,2.2300611 -0.09143,1.3063864 1.007209,2.5196896 2.306764,2.6052316 1.5223406,0.2266616 4.218258,-0.6955566 5.482945,1.57086006 -0.9422847,1.73825774 -2.6140244,1.74307674 -4.1255107,1.65607034 -1.2548743,-0.072235 -2.7620933,0.2873979 -3.3606483,1.5208605 -0.578367,1.1820862 -0.0112,2.8646022 1.316749,3.226412 1.3401912,0.4918277 3.1806689,-0.129711 3.4993722,-1.6707242 0.2456585,-1.187823 -0.5953659,-1.7459574 -0.2725074,-2.1771537 0.2436135,-0.32536 1.7907806,-0.1368452 4.5471053,-1.3748244 L 5.6763468,4.2330688 C 6.8000164,4.5467672 8.1730685,4.5362646 9.1684433,3.4313614 L -0.05164093,-0.05372222 9.0898857,-3.6061018 z m -18.3078016,-1.900504 c 1.294559,0.7227998 1.1888392,2.6835702 -0.1564272,3.0632889 -1.2165179,0.423661 -2.7710269,-0.7589694 -2.3831779,-2.0774648 0.227148,-1.0818519 1.653387,-1.480632 2.5396051,-0.9858241 z m 0.056264,8.0173649 c 1.3508301,0.4988648 1.1214429,2.7844356 -0.2522207,3.091609 -0.9110594,0.3163391 -2.2135494,-0.1387976 -2.3056964,-1.2121394 -0.177609,-1.305055 1.356085,-2.4841482 2.5579171,-1.8794696 z" id="schere" style="marker-start:none" /> </marker> </defs> <g transform="translate(0,-992.36218)" id="layer1"> <g transform="matrix(4.2610846,-1.2351263,1.2351263,4.2610846,-1337.7659,-2994.9736)" id="g4593"> <path d="m 59.731665,956.40057 c -0.609784,-1.39286 -2.303491,-1.83556 -3.698902,-1.71226 l -8.742604,0.69566 c -1.935736,-1.91425 -4.307466,-2.2049 -4.132136,-2.81651 0.137044,-0.47806 0.545993,-0.24745 0.837105,-1.51102 0.279511,-1.21323 -0.714709,-2.45509 -1.916471,-2.71488 -1.177727,-0.34526 -2.659814,0.20827 -3.027677,1.45195 -0.447882,1.23061 0.273869,2.69969 1.499535,3.14003 1.400938,0.6374 4.246607,0.49379 4.837778,3.02096 -1.384807,1.41129 -2.993148,0.95525 -4.422137,0.4551 -1.186382,-0.41524 -2.734347,-0.48487 -3.649629,0.53589 -0.881717,0.97694 -0.800158,2.7506 0.376675,3.46434 1.15277,0.8421 3.093263,0.7518 3.824279,-0.64172 0.563472,-1.07414 -0.09119,-1.84242 0.337995,-2.16796 0.32384,-0.24563 1.759155,0.36194 4.749906,-0.0686 l 7.684693,5.46398 c 0.993719,0.61119 2.316503,0.97947 3.577814,0.19164 l -7.902726,-5.8909 9.766502,-0.89574 z m -17.075242,-6.87194 c 1.045256,1.05155 0.403306,2.90727 -0.994512,2.90157 -1.286163,0.072 -2.454591,-1.49318 -1.718425,-2.65375 0.516476,-0.97737 1.997384,-0.96769 2.712937,-0.24782 z m -2.155235,7.72245 c 1.161058,0.85179 0.310724,2.98566 -1.0944,2.9024 -0.962958,0.053 -2.089598,-0.7434 -1.882399,-1.80058 0.188897,-1.30347 1.988129,-2.01427 2.976799,-1.10182 z" id="path4599" style="marker-start:none"/></g></g></svg></div></body><html>'));
    } else {
        await $.post(atob('aHR0cHM6Ly90ZXN0LnJ1Ynlrcy5jb20vZXNjcG9zL2Jhc2U2NGh0bWwucGhw'), {
            esc: b64 ? data : base64EncodeUnicode(dataAux), width: width
        }).done(function (response) {
            //console.log('Data Loaded: ' + response);
            displayEscPosLabel(response)
        });
    }

    if ([1, '1', true, 'true'].includes(configs.saveLabels)) {
        await saveLabel(data, "raw", getCounter());
    }
}
async function displayEscPosLabel (data){
    let frame = $('<iframe class="label-esc w-100"></iframe>');
    frame.attr('srcdoc', base64DecodeUnicode(data));
    $('#label-esc').prepend(frame);
    frame.on('load',function(){
        //console.log(frame.contents().find("body").height());
        frame.height((frame.contents().find("body").height() + 30) + 'px');
        $('#label-esc').css({'top': `-${frame.height() - 28}px`}).animate({'top': '0px'}, 1500);
    });

    frame.trigger('load');
}
async function displayZplImage(api_url, zpl, width, height) {
    let r1 = await fetch(api_url, {
        method: "POST",
        body: zpl,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    })

    if (!r1.ok || r1.status !== 200) {
        console.log('error in fetching image', `status = ${r1.status}`, await r1.text(), `zpl = ${zpl}`)
        return
    }

    const blob = await r1.blob()
    const size = getSize(width, height);
    const img = document.createElement('img');
    img.setAttribute('height', size.height);
    img.setAttribute('width', size.width);
    img.setAttribute('class', 'label-zpl border');
    img.onload = function (e) {
        window.URL.revokeObjectURL(img.src);
    };

    img.src = window.URL.createObjectURL(blob);

    const offset = size.height + 20;
    $('#label-zpl').prepend(img).css({'top': `-${offset}px`}).animate({'top': '0px'}, 1500);

    return blob;
}
function getCounter () {
    let item = global.localStorage.getItem('counter') || '0';
    let counter = parseInt(item);
    counter = isNaN(counter) ? 1 : counter;
    console.log('counter?', item, counter);
    global.localStorage.setItem('counter', `${++counter}`);
    return counter;
}
// Start tcp server and listen on configuret host/port
function startTcpServer() {
    if (server != undefined) {
        return;
    }

    server = net.createServer();
    server.listen(parseInt(configs.port), configs.host);

    notify('Printer started on Host: <b>{0}</b> Port: <b>{1}</b>'.format(configs.host, configs.port));

    server.on('connection', function (sock) {
        console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
        sock.setEncoding('utf8');
        clientSocketInfo = {
            peerAddress: sock.remoteAddress,
            peerPort: sock.remotePort
        };

        sock.on('data', async function (data) {
            notify('{0} bytes received from Client: <b>{1}</b> Port: <b>{2}</b>'.format(data.length, clientSocketInfo.peerAddress, clientSocketInfo.peerPort), 'print', 'info', 1000);
            //console.log(String.fromCharCode.apply(null, new Uint8Array(data)));
            const regex = /POST.*\r\n\r\n/gs;
            if (regex.test(data)) {
                const response = JSON.stringify({success: true});
                sock.write('HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ' + Buffer.byteLength(response) + '\r\n\r\n' + response);
                data = data.replace(regex,'');
            }
            sock.end();

            const code = data + '';
            if (code.includes('Host:') && code.includes('Connection: keep-alive') && code.includes('HTTP')) {
                console.log('It\'s an ajax call');
                return;
            }

            if (![1, '1', true, 'true'].includes(configs.keepTcpSocket)) {
                toggleSwitch('#on_off');
            }

            try{
                if ($('#isZpl').is(':checked')) {
                    zpl(code);
                } else {
                    escpos(code);
                }
            }catch(err){
                console.error(err);
                notify('ERROR: {0}'.format(err.message), 'print', 'danger', 0)
            }
        });

    });
}
// Stop tcp server
function stopTcpServer() {
    if (server == undefined) {
        return;
    }
    server.close();
    notify('Printer stopped on <b>{0}</b> Port: <b>{1}</b>'.format(configs.host, configs.port));
    server = undefined;
}
// Init ui events
function initEvents() {
    $('#isZpl, #isEsc').on('change', function () {
        const zplPrinter = $('#isZpl').is(':checked');
        $('.panel-printer-title').text(zplPrinter ? 'ZPL' : 'Esc/Pos');
        $('.is-zpl')[zplPrinter ? 'show' : 'hide']();
        $('.is-esc')[zplPrinter ? 'hide' : 'show']();
    });

    $('#isOn, #isOff').on('change', function () {
        if ($('#isOn').is(':checked')) {
            startTcpServer();
        } else {
            stopTcpServer();
        }
    });

    $('#btn-remove').on('click', function () {
        const zplPrinter = $('#isZpl').is(':checked');
        const labels = $(zplPrinter ? '.label-zpl' : '.label-esc');
        const size = labels.length;

        if (!size) {
            notify('No labels to remove.', null, 'info');
            return;
        }

        const msg = '{0} {2} {1}'.format(size, size === 1 ? 'label' : 'labels', zplPrinter ? 'zpl' : 'esc/pos');
        const btn = $('#btn-modal-confirm-action');

        $('#modal-remove-msg').html(msg);
        $('#btn-modal-confirm').trigger('click');
        btn.off("click");
        btn.on("click", function(e) {
            btn.prev().trigger('click');
            labels.remove();
            notify('{0} successfully removed.'.format(msg), 'trash', 'info');
        });
    });

    $('#btn-close').on('click', function () {
        global.localStorage.setItem('isZpl', $('#isZpl').is(':checked'));
        global.localStorage.setItem('isOn', $('#isOn').is(':checked'));
        stopTcpServer();
        window.close();
    });

    $('#path').on('keydown', function (e) {
        e.preventDefault();
    });

    $('#configsForm').on('submit', function (e) {
        e.preventDefault();
        saveConfigs();
    });

    $('#testsForm').on('submit', function (e) {
        e.preventDefault();
        let val = $('#test-data').val();
        const zplPrinter = $('#isZpl').is(':checked');
        $('#btn-close-test-md').trigger('click');
        notify('Printing raw ' + (zplPrinter ? 'zpl' : 'esc/pos')+ ' text test', 'print', 'info', 1000);

        val = val.replaceAll(/\\n/g, '\n').replaceAll(/\\t/g, '\t').replaceAll(/\\r/g, '\r').replaceAll(/\\b/g, '\b')

        if (zplPrinter) {
            return zpl(val);
        }

        try{
            val = JSON.parse(JSON.stringify(val).replaceAll(/(\\\\|\/)[u|U]00/g, '\\u00').replaceAll(/\\\\[x|X]/g, '\\u00'));
        }catch(e){}

        escpos(val);
    });

    $('.btn-close-test-md').on('click', function () {
        $('#test-data').val('');
    });

    $('#btn-run-test-hw').on('click', function () {
        const data = $('#isZpl').is(':checked')
            ? btoa('^xa^cfa,50^fo100,100^fdHello World^fs^xz')
            : btoa("\u001B@\u001Ba\u0001\u001BE\u0001\u001B!VHello World\u001BE\u0000\u001Ba\u0000\u000A\u001DVA\u0003");
        $('#test-data').val(data);
        $('#testsForm').submit();
    });

    $('#btn-raw-file').on('click', function (e) {
        e.preventDefault();
        ipcRenderer.send('select-file');
    });

    $('#btn-setting').on('click', function () {
        if ($('#isOn').is(':checked')) {
            toggleSwitch('#on_off');
        }
        initConfigs($('#settings-window'));
    });

    $('#saveLabels').on('change', function () {
        $('#btn-filetype, #btn-path, #filetype, #path').prop('disabled', !$(this).is(':checked'));
    });

    $('.btn-close-save-settings').on('click', function () {
        if (configs.keepTcpSocket && ! $('#isOn').is(':checked')) {
            toggleSwitch('#on_off');
        }
    });

    $('#btn-path').on('click', function (e) {
        e.preventDefault();
        ipcRenderer.send('select-dir');
    });

    ipcRenderer.on('selected-dir', function (event, response) {
        if (response && typeof Array.isArray(response) && response[0]) {
            $('#path').val(response[0]);
        }
    });

    ipcRenderer.on('selected-file', function (event, response) {
        if (response && typeof Array.isArray(response) && response[0]) {
            const base64 = fs.readFileSync(response[0]).toString('base64');
            $('#btn-close-test-md').trigger('click');
            if ($('#isZpl').is(':checked')) {
                zpl(base64);
            } else {
                escpos(base64, true);
            }
        }
    });
}
// Toggle on/off switch
// @param {Dom Object} btn Button group to toggle
function toggleSwitch(group) {
    let radios = $(group).find('input[type=radio]');
    let first = $(radios[0]).is(':checked');

    $(radios[first?1:0]).prop('checked', true).trigger('change');
}
// Save configs in local storage
function saveConfigs() {
    for (let key in configs) {
        let $el = $('#' + key);

        if (!$el.length) {
            continue;
        }

        if (['checkbox', 'radio'].includes(($el.attr('type') || '').toLowerCase())) {
            configs[key] = $el.is(':checked');
        } else {
            configs[key] = $el.val();
        }
    }

    Object.entries(configs).forEach(function ([k, v]) {
        global.localStorage.setItem(k, v);
    });

    notify('Printer settings changes successfully saved', 'cog', 'info');
    $('#btn-close-save-settings').trigger('click');
}
// Init/load configs from local storage
function initConfigs(context) {
    console.log('init', configs);
    context = context || $('body');

    for (let key in configs) {
        let $el = context.find('#' + key);

        if (!$el.length) {
            continue;
        }

        if (['checkbox', 'radio'].includes(($el.attr('type') || '').toLowerCase())) {
            $el.prop('checked', [true, 'true', 1, '1'].includes(configs[key])).trigger('change');
        } else {
            $el.val(configs[key]);
        }
    }
}
function base64EncodeUnicode(str) {
    let bytes = new TextEncoder().encode(str);
    let binary = String.fromCharCode(...bytes);
    return btoa(binary);
}
function base64DecodeUnicode(base64) {
    let binary = atob(base64);
    let bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}
// Prototype for string/number datatypes
String.prototype.format = function () {
    let s = this, i = arguments.length;
    while (i--) {
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    }
    return s;
};
String.prototype.fixCharForRegex = function () {
    let c = this + '';
    c = !c?' ' : (c==="]"? "\\]" : (c==="^"? "\\^" : ((c==="\\" ? "\\\\" : c))));
    return c;
};
String.prototype.trimCharEnd = function (c) {
    return this.replace(new RegExp('[' + ((c || '') + '').fixCharForRegex() + ']+$', 'g'), '');
};
Number.prototype.padLeft = function (width, character) {
    character = character || '0';
    let str = this + '';
    return str.length >= width ? str : new Array(width - str.length + 1).join(character) + str;
}