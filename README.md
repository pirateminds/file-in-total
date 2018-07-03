<h1 align="center">File in total</h1>

<p align="center">That is the demo app, not stand alone library, based on <a href="https://github.com/facebook/create-react-app">create-react-app</a>.</p>

```javascript
npm install
npm start
```

The core code used is inside the `./src/scanner` folder. But all together ideas are inside the `./src/services` folder. The motivation is to move the code, was developed to solve one specific bussines case, from `services` to more generic `scanner` and publish it like an library.

## Core concepts

- upload by using: `multiple`, `webkitdirectory`, `mozdirectory`, `odirectory`, `msdirectory`, `directory`;
- supports both picking using input[file] and drag & drop. I.e. FileList and DataTransferItemList;
- supports single file picking;
- we should be able to receive scanning state any time. Thats why FolderDTO here;
- we should be able stop the process;
- we should be able start multiple scanning processes in parallel;
- we able adds throttle both for scanning and uploading to avoid UI freezes;
- should be able to start scanning process inside web worker;
- should be able adds custom logic on any new file scanning: like filtering, uploading and so on;
- supports different scanning strategies. For example when we have dependencies in files;

## TODO

- [x] upload by using: `multiple`, `webkitdirectory`, `mozdirectory`, `odirectory`, `msdirectory`, `directory`;
- [x] supports both picking using input[file] and drag & drop. I.e. FileList and DataTransferItemList;
- [x] we should be able to receive scanning state any time. Thats why FolderDTO here;
- [ ] we able adds throttle both for scanning and uploading to avoid UI freezes;
- [ ] we should be able stop the process;
- [ ] supports single file picking;
- [ ] we should be able start multiple scanning processes in parallel;
- [ ] should be able to start scanning process inside web worker;
- [ ] should be able adds custom logic on any new file scanning: like filtering, uploading and so on;
- [ ] supports different scanning strategies. For example when we have file dependencies;

---
Copyright (c) 2017 pirateminds.com. Licensed with The MIT License (MIT)
