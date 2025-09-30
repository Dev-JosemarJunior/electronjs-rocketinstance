
const { app, BrowserWindow, Notification, Tray, Menu, nativeImage, shell, ipcMain } = require('electron');
app.setAppUserModelId('com.solucao.chat');
const path = require('path');

let mainWindow;
let tray = null;

const gotTheLock = app.requestSingleInstanceLock();

function restoreAndFocusMainWindow() {
    if (!mainWindow) return;

    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }

    mainWindow.show();

    // 🔸 Windows focus workaround
    setTimeout(() => {
        mainWindow.restore();
        mainWindow.focus();
        try {
            app.focus({ steal: true });
        } catch (e) {
            console.warn('Focus steal not supported on this platform:', e);
        }
    }, 100);
}

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });

    function createWindow() {
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            icon: path.join(__dirname, 'icon.ico'),
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
            }
        });

        function requestPermissionChat() {
            const result = null;
            console.log("Notify permission before: " + result)
            Notification.requestPermission((result) => {
                console.log("Notify permission: " + result);
            })
        }

        mainWindow.loadURL("https://sac-solucao.gestaointegrado.net/");

        mainWindow.setMenuBarVisibility(true);
        mainWindow.autoHideMenuBar = false;

        // Inject Notification override in the page context after DOM ready
        mainWindow.webContents.on('dom-ready', () => {
            mainWindow.webContents.executeJavaScript(`
            (function() {
                const OriginalNotification = window.Notification;
                class InterceptedNotification extends OriginalNotification {
                    constructor(title, options) {
                        super(title, options);
                        this.addEventListener('click', () => {
                            window.electronAPI?.notifyClick?.();
                        });
                    }
                }
                InterceptedNotification.requestPermission = OriginalNotification.requestPermission.bind(OriginalNotification);
                Object.defineProperty(InterceptedNotification, 'permission', {
                    get: () => OriginalNotification.permission,
                });
                window.Notification = InterceptedNotification;
                console.log("[Electron] Notification overridden successfully");
            })();
        `);
        });

        const menuTemplate = [
            {
                label: 'Links Úteis',
                submenu: [
                    {
                        label: 'Ahreas',
                        submenu: [
                            { label: 'Página Principal', click: () => shell.openExternal('http://ahreas.gruposolucao.sdtecnologia.net.br/condominioweb/') },
                            { label: 'Buscar Condomínios', click: () => shell.openExternal('http://ahreas.gruposolucao.sdtecnologia.net.br/condominioweb/Cadastro/Cadastros/CadCondominios.aspx') },
                            { label: 'Buscar Pessoas', click: () => shell.openExternal('http://ahreas.gruposolucao.sdtecnologia.net.br/condominioweb/Cadastro/Cadastros/CadCliente.aspx') },
                            { label: 'Buscar/Enviar Boletos', click: () => shell.openExternal('http://ahreas.gruposolucao.sdtecnologia.net.br/condominioweb/receber/recibos/boletosbancarios.aspx') },
                            { label: 'Programação > Lançamentos', click: () => shell.openExternal('http://ahreas.gestartcondominios.com.br/condominioweb/Pagar/Programacao/ContasPagar.aspx') },
                        ]
                    },
                    {
                        label: 'SGI',
                        submenu: [
                            { label: 'Página Principal', click: () => shell.openExternal('https://solucao.gestaointegrado.net/app/home') },
                            { label: 'Buscar Condomínios', click: () => shell.openExternal('https://solucao.gestaointegrado.net/app/condominios/buscar') },
                            { label: 'Visualizar Certificados', click: () => shell.openExternal('https://solucao.gestaointegrado.net/app/condominios/certificados') },
                            { label: 'Enviar Comunicados (Mala Direta)', click: () => shell.openExternal('https://solucao.gestaointegrado.net/app/mala-direta/cadastrar') },
                            { label: 'Criar Protocolos', click: () => shell.openExternal('https://solucao.gestaointegrado.net/app/protocolos/cadastrar') },
                        ]
                    },
                    {
                        label: 'Portal360',
                        submenu: [
                            { label: 'Página Principal', click: () => shell.openExternal('https://portalgscia.com.br/') },
                            {
                                label: 'Tarefas', submenu: [
                                    { label: 'Benefícios', click: () => shell.openExternal('https://portalgscia.com.br/pages/Tarefas/beneficios.html') },
                                    { label: 'Balancetes', click: () => shell.openExternal('https://portalgscia.com.br/pages/Tarefas/balancete.html') },
                                ]
                            },
                            { label: 'Fale com o Grupo Solução', click: () => shell.openExternal('https://portalgscia.com.br/pages/pagesSindico/FalarSolucao/FalarSolucao.html') },
                            { label: 'Cadastrar Colaborador', click: () => shell.openExternal('https://portalgscia.com.br/pages/pagesSindico/CadastroExterno/CadastroExterno.html') }
                        ]
                    },
                    {
                        label: 'DTI',
                        submenu: [
                            { label: 'Baixar Anydesk', click: () => shell.openExternal('https://anydesk.com/pt/downloads/thank-you?dv=win_exe') },
                        ]
                    },
                    {
                        label: 'Email (Outlook)',
                        click: () => shell.openExternal('https://outlook.office.com/mail/')
                    },
                    {
                        label: 'ChatGPT',
                        click: () => shell.openExternal('https://chatgpt.com/')
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(menuTemplate);
        Menu.setApplicationMenu(menu); // adds it to the top menu bar

        // Hide to tray on close
        mainWindow.on('close', (event) => {
            if (!app.isQuiting) {
                event.preventDefault();
                mainWindow.hide();
            }
            return false;
        });
    }

    function createTray() {
        tray = new Tray(path.join(__dirname, 'icon.ico'));

        const contextMenu = Menu.buildFromTemplate([
            { label: 'Links Úteis', enabled: false }, // show Rocket window
            { type: 'separator' },
            { label: 'Chat Solução', click: () => mainWindow.show() }, // show Rocket window
            { label: 'Ahreas', click: () => shell.openExternal('http://ahreas.gruposolucao.sdtecnologia.net.br/condominioweb/') },
            { label: 'SGI', click: () => shell.openExternal('https://solucao.gestaointegrado.net/login') },
            { label: 'Portal360', click: () => shell.openExternal('https://portalgscia.com.br/') },
            { label: 'Email', click: () => shell.openExternal('https://outlook.office.com/mail/') },
            { type: 'separator' },
            { label: 'Sair', click: () => app.exit() }
        ]);

        tray.setToolTip('Solução Chat');
        tray.setContextMenu(contextMenu);

        tray.on('double-click', () => {
            console.log("main: tray clicked")
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.show();
                mainWindow.focus();
            }
        });
    }

    app.whenReady().then(() => {
        createWindow();
        createTray();

        ipcMain.on('notification-clicked', () => {
            console.log("Notification clicked event caught in main!");
            if (!mainWindow) return;

            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            setTimeout(() => {
                mainWindow.focus();
                try { app.focus({ steal: true }); } catch (_) { }
            }, 100);
        });
    });

    const AutoLaunch = require('auto-launch');

    const autoLauncher = new AutoLaunch({
        name: 'Chat Solução',
        path: app.getPath('exe'),
    });

    autoLauncher.isEnabled().then((enabled) => {
        if (!enabled) autoLauncher.enable();
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    app.setAppUserModelId("Solução Chat");
}

