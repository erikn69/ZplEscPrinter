const path = require('path');

const packageJson = require('./package.json');

const {version} = packageJson;
const iconDir = path.resolve(__dirname, 'icons');

const config = {
    packagerConfig: {
        name: "Zpl-EscPos Printer",
        executableName: 'zpl-escpos-printer',
        icon: path.resolve(__dirname, 'icons', 'icon'),
    },
    makers: [
        {
            name: "@rabbitholesyndrome/electron-forge-maker-portable",
            platforms: ['win32'],
            config: {
                portable: {
                    artifactName: "${name}-portable-${version}.exe"
                }
            }
        },
        {
            name: "@electron-forge/maker-squirrel",
            platforms: ['win32'],
            config: (arch) => ({
                name: "zpl-escpos-printer",
                exe: 'zpl-escpos-printer.exe',
                iconUrl: "https://github.com/erikn69/ZplEscPrinter/blob/master/icons/icon.ico?raw=true",
                noMsi: true,
                setupExe: `zpl-escpos-printer-${version}-win32-${arch}-setup.exe`,
                setupIcon: path.resolve(iconDir, "icon.ico"),
            })
        },
        {
            name: "@electron-forge/maker-zip",
            platforms: [
                "darwin",
                "linux"
            ]
        },
        {
            name: "@electron-forge/maker-deb",
            config: {
                icon: {
                    scalable: path.resolve(iconDir, 'icon.svg')
                }
            }
        },
        {
            name: "@electron-forge/maker-rpm",
            config: {
                icon: {
                    scalable: path.resolve(iconDir, 'icon.svg')
                }
            }
        }
    ],
    publishers: [
        {
            name: "@electron-forge/publisher-github",
            config: {
                repository: {
                    owner: "erikn69",
                    name: "ZplEscPrinter"
                },
                prerelease: false,
                draft: true
            }
        }
    ]
};

module.exports = config;