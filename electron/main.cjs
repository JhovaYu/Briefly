const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

const isDev = !app.isPackaged;
let signalingProcess = null;

/**
 * Levantar el signaling server local de y-webrtc.
 * Esto permite que peers se descubran sin depender de servidores externos.
 * Puerto 4444 por defecto.
 */
function startSignalingServer() {
    try {
        // El binario de y-webrtc-signaling está en node_modules/.bin/
        const signalingBin = isDev
            ? path.join(__dirname, '..', 'node_modules', '.bin', 'y-webrtc-signaling')
            : path.join(process.resourcesPath, 'node_modules', '.bin', 'y-webrtc-signaling');

        // Usamos spawn en vez de fork para ejecutar el binario
        const { spawn } = require('child_process');

        // En Windows, ejecutar el .cmd
        const isWin = process.platform === 'win32';
        const cmd = isWin ? `${signalingBin}.cmd` : signalingBin;

        signalingProcess = spawn(cmd, [], {
            stdio: 'pipe',
            env: { ...process.env, PORT: '4444' },
            shell: isWin,
        });

        signalingProcess.stdout?.on('data', (data) => {
            console.log(`[Signaling] ${data.toString().trim()}`);
        });

        signalingProcess.stderr?.on('data', (data) => {
            console.error(`[Signaling Error] ${data.toString().trim()}`);
        });

        signalingProcess.on('error', (err) => {
            console.error('[Signaling] Failed to start:', err.message);
        });

        console.log('[Fluent] Signaling server iniciado en puerto 4444');
    } catch (err) {
        console.error('[Fluent] Error al iniciar signaling server:', err);
    }
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'Fluent',
        icon: path.join(__dirname, '../public/vite.svg'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        titleBarStyle: 'default',
        backgroundColor: '#1e1e1e',
        show: false,
    });

    win.once('ready-to-show', () => {
        win.show();
    });

    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools({ mode: 'detach' });
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    win.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });
}

app.whenReady().then(() => {
    // Primero levantar signaling, luego la ventana
    startSignalingServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    // Matar signaling server al cerrar
    if (signalingProcess) {
        signalingProcess.kill();
        signalingProcess = null;
    }
});
