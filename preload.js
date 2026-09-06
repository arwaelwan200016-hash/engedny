const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('engedny', {
  data: () => ipcRenderer.invoke('app:data'), search: term => ipcRenderer.invoke('providers:search', term),
  createRequest: payload => ipcRenderer.invoke('request:create', payload), toggleFavorite: id => ipcRenderer.invoke('favorite:toggle', id)
});
