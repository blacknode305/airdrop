const FtpSrv = require('ftp-srv'); // Подключаем библиотеку FTP-сервера

const path = require('path'); // Модуль для работы с путями (кроссплатформенно)
const fs = require('fs'); // Модуль для работы с файловой системой
const os = require('os'); // Модуль для работы с сетевыми интерфейсами
const { execSync } = require('child_process'); // Модуль для выполнения shell-команд (нужен для получения IP на macOS)

// Объект с параметрами сервера
const param = {
  localIP: undefined,   // Здесь будет храниться локальный IP
  rootPath: undefined,  // Корневая папка FTP-сервера
}

// Функция автоматического получения локального IP-адреса
function getLocalIP() {
  try {

    // Если операционная система macOS
    if (process.platform === 'darwin') {

      // Устанавливаем путь к общей папке
      param.rootPath = path.join(__dirname, '../../../_shared'); // "airdrop" > "../project/" > "../code/" > "../_data" > _data/_shared

      // Выполняем команду получения IP для интерфейса en0
      return execSync('ipconfig getifaddr en0')
        .toString()   // Преобразуем Buffer в строку
        .trim();      // Убираем лишние пробелы и перенос строки
    }

    // Если Android / Termux / Linux

    // Получаем список сетевых интерфейсов
    const nets = os.networkInterfaces();

    // Проходим по каждому сетевому интерфейсу
    for (const name of Object.keys(nets)) {

      // Проходим по каждому адресу интерфейса
      for (const net of nets[name]) {

        // Ищем IPv4 адрес, который не является внутренним (localhost)
        if (net.family === 'IPv4' && !net.internal) {

          // Устанавливаем путь к общей папке для Linux/Android
          param.rootPath = path.join(
            __dirname,
            '..../storage/downloads/_data/_shared'
          );

          // Возвращаем найденный IP-адрес
          return net.address;
        }
      }
    }

    // Если IP не найден — выбрасываем ошибку
    throw new Error('IP не найден');
  }
  catch (err) {

    // Выводим ошибку в консоль
    console.error('Не удалось получить IP:', err.message);

    // Завершаем процесс с кодом ошибки
    process.exit(1);
  }
}

// Сохраняем найденный IP в параметрах
param.localIP = getLocalIP();

// Выводим список файлов в корневой папке (для проверки)
console.log(fs.readdirSync(param.rootPath));

// Создаём FTP-сервер
const ftpServer = new FtpSrv({

  // Сервер слушает на всех интерфейсах на порту 2121
  url: 'ftp://0.0.0.0:2121',

  // Указываем IP для пассивного режима FTP
  pasv_url: param.localIP,

  // Минимальный порт для пассивных соединений
  pasv_min: 1024,

  // Максимальный порт для пассивных соединений
  pasv_max: 1050,

  // Отключаем анонимный доступ
  anonymous: false
});

// Обработчик события входа пользователя
ftpServer.on('login', ({ username, password }, resolve, reject) => {

  // Проверяем логин и пароль
  if (username === 'blacknode301' && password === 'airdrop123') {

    // Если данные верные — разрешаем доступ
    // root указывает на корневую папку FTP
    resolve({ root: param.rootPath });
  }
  else {

    // Если неверные — отклоняем подключение
    reject(new Error('Invalid credentials'));
  }
});

// Запускаем сервер
ftpServer.listen().then(() => {

  // Выводим информацию о запуске
  console.log('==============================');
  console.log('FTP сервер запущен!');
  console.log('IP сервера:', param.localIP);
  console.log('Порт: 2121');
  console.log('==============================');
});
