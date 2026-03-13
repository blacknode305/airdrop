const ftp = require('basic-ftp'); // Подключаем FTP-клиент библиотеку

const path = require('path'); // Модуль для работы с путями
const fs = require('fs'); // Модуль для работы с файловой системой
const readline = require('readline'); // Подключаем модуль для работы с CLI (ввод из консоли)
const cliProgress = require('cli-progress'); // Подключаем библиотеку для отображения прогресс-бара

// Объект с параметрами клиента
const param = {
  localPath: undefined,          // Локальная папка для синхронизации
  user: 'blacknode301',          // Логин FTP (лучше вынести в .env)
  password: 'airdrop123',        // Пароль FTP (лучше вынести в .env)
};

// Если система macOS
if (process.platform === 'darwin') {
  // Устанавливаем путь к папке относительно проекта
  // TODO:
  param.localPath = path.join(__dirname, '../../../_shared');
}
// Если Android / Termux / Linux
else {
  // Устанавливаем другой путь для Linux/Android
  param.localPath = path.resolve('./../../storage/downloads/_data/_shared');
}

// Выводим список файлов в локальной папке (для проверки)
console.log(fs.readdirSync(param.localPath));

// Путь к файлу конфигурации
const CONFIG_FILE = path.resolve('./config.json');

// Если папка не существует — создаём её
if (!fs.existsSync(param.localPath)) {
  fs.mkdirSync(param.localPath, { recursive: true });
}

// Объект конфигурации
let config = {};

// Если файл конфигурации существует — читаем его
if (fs.existsSync(CONFIG_FILE)) {
  config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

// Создаём интерфейс для ввода в консоли
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Функция для запроса ввода у пользователя
function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

// Функция создания прогресс-бара
function createProgressBar(total) {
  return new cliProgress.SingleBar({
    format: 'Синхронизация [{bar}] {percentage}% | {value}/{total} байт | {speed} МБ/с'
  }, cliProgress.Presets.shades_classic);
}

// Рекурсивная функция обхода директории (сейчас не используется)
function walkDir(dir) {
  let files = [];

  // Проходим по всем файлам в папке
  for (let f of fs.readdirSync(dir)) {

    const fullPath = path.join(dir, f); // Полный путь
    const stats = fs.statSync(fullPath); // Получаем информацию о файле

    // Если это папка — вызываем рекурсию
    if (stats.isDirectory()) {
      files = files.concat(
        walkDir(fullPath).map(sub => path.join(f, sub))
      );
    }
    else {
      // Если файл — добавляем в список
      files.push(f);
    }
  }
  return files;
}

// Главная функция синхронизации папок
async function syncFolder(client, localDir, remoteDir = '') {

  // Получаем список файлов на сервере
  const serverFiles = await client.list(remoteDir);

  // Объект для хранения информации о файлах сервера
  const serverMap = {};

  // Формируем карту файлов сервера
  for (let f of serverFiles) {
    if (f.type === '-') { // '-' означает обычный файл
      serverMap[f.name] = {
        size: f.size,
        modifiedAt: new Date(f.modifiedAt).getTime()
      };
    }
  }

  // Получаем список локальных файлов
  const localFiles = fs.readdirSync(localDir);

  // ===== 1️⃣ СКАЧИВАНИЕ =====
  for (let f of serverFiles) {

    const localPath = path.join(localDir, f.name);

    // Если это папка
    if (f.type === 'd') {

      // Если локальной папки нет — создаём
      if (!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath);
      }

      // Рекурсивно синхронизируем вложенную папку
      await syncFolder(client, localPath, path.posix.join(remoteDir, f.name));
    }
    else {
      let needDownload = false;

      // Если файла нет локально — нужно скачать
      if (!fs.existsSync(localPath)) {
        needDownload = true;
      }
      else {
        // Проверяем размер и дату изменения
        const stats = fs.statSync(localPath);
        if (
          stats.size !== f.size ||
          stats.mtime.getTime() < new Date(f.modifiedAt).getTime()
        ) {
          needDownload = true;
        }
      }

      // Если требуется скачивание
      if (needDownload) {

        console.log(`Скачиваем: ${path.join(remoteDir, f.name)}`);

        const bar = createProgressBar(f.size); // Создаём прогресс-бар
        bar.start(f.size, 0, { speed: "0.00" });

        const startTime = Date.now();

        // Отслеживаем прогресс загрузки
        client.trackProgress(info => {
          if (info.name === f.name) {

            const elapsed = (Date.now() - startTime) / 1000;

            const speed = (
              (info.bytesOverall / 1024 / 1024) /
              (elapsed || 1)
            ).toFixed(2);

            bar.update(info.bytesOverall, { speed });
          }
        });

        // Скачиваем файл
        await client.downloadTo(
          localPath,
          path.posix.join(remoteDir, f.name)
        );

        bar.stop(); // Останавливаем прогресс-бар
      }
    }
  }

  // ===== 2️⃣ ЗАГРУЗКА =====
  for (let fName of localFiles) {

    const localPath = path.join(localDir, fName);
    const stats = fs.statSync(localPath);
    const remotePath = path.posix.join(remoteDir, fName);

    // Если это папка
    if (stats.isDirectory()) {

      try {
        await client.ensureDir(remotePath); // Создаём папку на сервере
      } catch {}

      // Рекурсивно синхронизируем
      await syncFolder(client, localPath, remotePath);
    }
    else {

      let needUpload = false;

      // Если файла нет на сервере — загружаем
      if (!serverMap[fName]) {
        needUpload = true;
      }
      // Если размер или дата отличаются — загружаем
      else if (
        stats.size !== serverMap[fName].size ||
        stats.mtime.getTime() > serverMap[fName].modifiedAt
      ) {
        needUpload = true;
      }

      // Если требуется загрузка
      if (needUpload) {

        console.log(`Загружаем: ${remotePath}`);

        const bar = createProgressBar(stats.size);
        bar.start(stats.size, 0, { speed: "0.00" });

        const startTime = Date.now();

        // Отслеживание прогресса
        client.trackProgress(info => {
          if (info.name === fName) {

            const elapsed = (Date.now() - startTime) / 1000;

            const speed = (
              (info.bytesOverall / 1024 / 1024) /
              (elapsed || 1)
            ).toFixed(2);

            bar.update(info.bytesOverall, { speed });
          }
        });

        // Загружаем файл
        await client.uploadFrom(localPath, remotePath);

        bar.stop();
      }
    }
  }
}

// Главная функция запуска клиента
async function start() {

  // Запрашиваем IP сервера
  let serverIP = await ask(
    `Введите IP сервера [${config.lastIP || ''}]: `
  );

  // Если пусто — используем последний IP
  serverIP = serverIP.trim() || config.lastIP;

  // Если IP не указан — выходим
  if (!serverIP) {
    console.log('IP не указан!');
    process.exit();
  }

  // Сохраняем IP в конфиг
  config.lastIP = serverIP;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  // Создаём FTP-клиент
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    // Подключаемся к серверу
    await client.access({
      host: serverIP,
      port: 2121,
      user: param.user,
      password: param.password,
      secure: false
    });

    console.log('\nПодключено к серверу! Начинаем синхронизацию...\n');

    // Запускаем синхронизацию
    await syncFolder(client, param.localPath);

    console.log('\nСинхронизация завершена!');

    rl.close();      // Закрываем readline
    client.close();  // Закрываем соединение
  }
  catch (err) {
    // Обработка ошибки подключения
    console.error('Ошибка:', err.message);
    rl.close();
  }
}

// Запуск программы
start();
