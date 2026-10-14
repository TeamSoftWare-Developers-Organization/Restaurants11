const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// native desktop and thermal printing features safely
contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform,
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    printSilent: (options) => ipcRenderer.invoke('print-silent', options),
    toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
    minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
    maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
    closeWindow: () => ipcRenderer.invoke('window-close'),
    getMachineId: () => ipcRenderer.invoke('get-machine-id')
});
