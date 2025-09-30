const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  notifyClick: () => ipcRenderer.send('notification-clicked')
});

console.log("preload injected");

class InterceptedNotification extends window.Notification {
  constructor(title, options) {
    console.log("Intercept preload new Notification:", title, options);
    super(title, options);
    this.addEventListener('click', () => {
      console.log("preload click event");
      ipcRenderer.send('notification-clicked');
    });
  }
}

window.Notification = InterceptedNotification;