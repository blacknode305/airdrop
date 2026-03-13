# 📦 FTP Sync Tool (Node.js)

Node.js FTP Server & Client with bidirectional folder synchronization, automatic local IP detection and CLI progress tracking.

## 🚀 Project Overview

This project implements a lightweight FTP synchronization system in Node.js, including:

- 📁 FTP server using `ftp-srv`
- 📤 CLI client using `basic-ftp`
- 🔁 Recursive bidirectional synchronization
- 🚦 File change detection (size + modified timestamp)
- 📊 Real-time transfer progress bar
- 🤖 Automatic local IP detection
- 💾 Saved config for server IP

It works on:

- macOS
- Linux
- Windows
- Android (Termux)

---

## ⚠ Important

If you're running the server on one device, run the client on other devices and enter the server's IP address the first time you connect (you can use the previous IP address later, unless it changes).

---

## 📦 Features

✔ Bidirectional folder sync  
✔ Node.js CLI interface  
✔ Recursive sync logic  
✔ Progress bar with transfer speed  
✔ Automatic local IP detection  
✔ Lightweight & simple tool

---

## 🛠 Installation

Clone the repo and install dependencies:

```bash
git clone https://github.com/blacknode305/airdrop.git
cd airdrop
npm install
```

---

## 🛠 Running on Linux

Clone the repo and install dependencies:

```bash
git clone https://github.com/blacknode305/airdrop.git
cd airdrop
npm install
```

---

## 🛠 Running on Mac

Clone the repo and install dependencies:

```bash
git clone https://github.com/blacknode305/airdrop.git
cd airdrop
npm install
```

---

## 🛠 Running on Windows

Clone the repo and install dependencies:

```bash
git clone https://github.com/blacknode305/airdrop.git
cd airdrop
npm install
```

---


## 📱 Running on Android (Termux)

1. Install Termux from F-Droid  

2. Setup Termux storage:

```bash
termux-setup-storage
```
2. Update packages:

```bash
pkg update && pkg upgrade
```
3. Install dependencies:

```bash
pkg install nodejs git
```

4. Clone repository:

```bash
git clone https://github.com/blacknode305/airdrop.git
cd airdrop
```

5. Install npm packages:

```bash
npm install
```

6. Run server or client:

```bash
npm run server
npm run client
```

----
