const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let db;
function initDatabase() {
  db = new Database(path.join(app.getPath('userData'), 'engedny.db'));
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS services(id INTEGER PRIMARY KEY, name_en TEXT UNIQUE, name_ar TEXT, icon TEXT);
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, full_name TEXT, email TEXT UNIQUE, phone TEXT, role TEXT);
    CREATE TABLE IF NOT EXISTS providers(id INTEGER PRIMARY KEY, user_id INTEGER UNIQUE, service_id INTEGER, location TEXT, experience INTEGER, price REAL, rating REAL, review_count INTEGER, bio TEXT);
    CREATE TABLE IF NOT EXISTS requests(id INTEGER PRIMARY KEY, customer_id INTEGER, provider_id INTEGER, service_id INTEGER, description TEXT, location TEXT, date TEXT, time TEXT, price REAL, status TEXT DEFAULT 'Pending', created_at TEXT);
    CREATE TABLE IF NOT EXISTS favorites(customer_id INTEGER, provider_id INTEGER, PRIMARY KEY(customer_id, provider_id));
    CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, sender_id INTEGER, receiver_id INTEGER, message TEXT, created_at TEXT);
  `);
  const count = db.prepare('SELECT count(*) n FROM services').get().n;
  if (!count) {
    const addService = db.prepare('INSERT INTO services(name_en,name_ar,icon) VALUES(?,?,?)');
    [['Electrician','كهربائي','⚡'],['Plumber','سباك','🔧'],['Carpenter','نجار','🪚'],['Painter','دهان','🎨'],['AC Technician','فني تكييف','❄'],['Cleaning','تنظيف','✦'],['Appliance Repair','إصلاح أجهزة','🛠'],['General Maintenance','صيانة عامة','🏠']].forEach(x => addService.run(...x));
    db.prepare("INSERT INTO users(id,full_name,email,phone,role) VALUES(1,'أحمد السيد','ahmed@engedny.local','01000000000','customer')").run();
    const addUser = db.prepare('INSERT INTO users(full_name,email,phone,role) VALUES(?,?,?,?)');
    const addProvider = db.prepare('INSERT INTO providers(user_id,service_id,location,experience,price,rating,review_count,bio) VALUES(?,?,?,?,?,?,?,?)');
    [['محمد علي','mohamed@engedny.local','01010000001',2,'القاهرة',8,200,4.9,41,'كهربائي مرخّص للاستجابات السريعة.'],['أحمد محمود','ahmedp@engedny.local','01010000002',1,'الجيزة',6,150,4.8,24,'متخصص سباكة للمنازل والمكاتب.'],['سارة محمود','sara@engedny.local','01010000003',6,'الجيزة',4,120,4.7,18,'تنظيف احترافي دقيق وودود.'],['عمر عادل','omar@engedny.local','01010000004',5,'القاهرة',7,220,4.6,29,'تركيب وصيانة أجهزة التكييف.']].forEach(([name,email,phone,service,location,exp,price,rating,reviews,bio]) => { const id=addUser.run(name,email,phone,'provider').lastInsertRowid; addProvider.run(id,service,location,exp,price,rating,reviews,bio); });
  }
}
function providers(term='') {
  return db.prepare(`SELECT p.*, u.full_name, u.phone, s.name_en, s.name_ar, s.icon FROM providers p JOIN users u ON u.id=p.user_id JOIN services s ON s.id=p.service_id WHERE lower(u.full_name) LIKE lower(?) OR lower(s.name_en) LIKE lower(?) OR s.name_ar LIKE ? OR lower(p.location) LIKE lower(?) ORDER BY p.rating DESC`).all(...Array(4).fill(`%${term}%`));
}
function createWindow() {
  const win = new BrowserWindow({ width: 1280, height: 820, minWidth: 980, minHeight: 680, backgroundColor: '#ebe8f2', autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname,'preload.js'), contextIsolation: true, nodeIntegration: false } });
  win.loadFile('index.html');
  if (process.env.ENGEDNY_CAPTURE === '1') {
    win.webContents.once('did-finish-load', async () => {
      const image = await win.webContents.capturePage();
      fs.writeFileSync(path.join(__dirname, 'assets', 'electron-render.png'), image.toPNG());
      app.quit();
    });
  }
}
app.whenReady().then(() => { initDatabase(); createWindow(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('app:data', () => ({ user: db.prepare('SELECT * FROM users WHERE id=1').get(), services: db.prepare('SELECT * FROM services').all(), providers: providers(), requests: db.prepare(`SELECT r.*,s.name_ar,u.full_name provider_name FROM requests r JOIN services s ON s.id=r.service_id JOIN providers p ON p.id=r.provider_id JOIN users u ON u.id=p.user_id WHERE r.customer_id=1 ORDER BY r.id DESC`).all() }));
ipcMain.handle('providers:search', (_, term) => providers(term));
ipcMain.handle('request:create', (_, request) => { const id = db.prepare("INSERT INTO requests(customer_id,provider_id,service_id,description,location,date,time,price,status,created_at) VALUES(1,?,?,?,?,?,?,?,?,datetime('now'))").run(request.providerId,request.serviceId,request.description,request.location,request.date,request.time,request.price,'Pending').lastInsertRowid; return { id }; });
ipcMain.handle('favorite:toggle', (_, providerId) => { const exists=db.prepare('SELECT 1 FROM favorites WHERE customer_id=1 AND provider_id=?').get(providerId); if(exists) db.prepare('DELETE FROM favorites WHERE customer_id=1 AND provider_id=?').run(providerId); else db.prepare('INSERT INTO favorites(customer_id,provider_id) VALUES(1,?)').run(providerId); return !exists; });
