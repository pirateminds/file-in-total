import { EntryDTO, FolderDTO, FileDTO, STATE_COMPLETED, STATE_PENDING, STATE_IN_PROGRESS } from "./dto";

// TODO make it some how different
let scanned = {};

// it's for just file picker upload, without drag and drop
const addItem = (item, metadata, obj) => {
    let name = item.relativePath || item.webkitRelativePath || item.name;
    return EntryDTO.of({
        item: item,
        count: 1,
        metadata: metadata,
        ext: name.substr(name.lastIndexOf(".") + 1),
        itemName: name,
        folderDTO: obj,
    });
}

const entriesToArray = (list) => {
    return Array.prototype.slice.call(list || [], 0);
}

const filterFiles = (obj, folderDTO) => {
    let items = [];

    // tslint:disable-next-line:forin
    for (let o in obj) {
        o = obj[o];
        let name = o.relativePath || o.webkitRelativePath || o.name;
        if (name) {
            // tslint:disable-next-line:no-null-keyword
            items.push(addItem(o, null, folderDTO));
        }
    }

    return items.filter((i) => i.item.size);
}

const filterFile = (entry, metadata) =>
    (metadata ? metadata.size : entry.size); //&& (!this.regex || this.regex && (this.regex).test(entry.relativePath || entry.webkitRelativePath || entry.name));

const filterEntries = (entries, obj = { foldersCount: 0, files: [], folders: [] }) => {
    entries.forEach((entry) => {
        if (!entry) {
            return;
        }

        if (entry.isFile) {
            obj.totalFiles += 1;
            entry.getMetadata((metadata) => {
                if (filterFile(entry, metadata)) {
                    obj.files.push(addItem(entry, metadata, obj));
                }
            });
        }

        if (entry.isDirectory) {
            obj.foldersCount += 1;
            obj.folders && obj.folders.push(entry.createReader());
        }
    });

    return obj;
}

const scanFolder = (reader, entries) => {
    entries = entries || [];
    reader.readEntries((results) => {
        // This recursion, it works cause we receive just an links array
        // We upload files one by one
        // The uploaded one removed from memory
        if (results.length) { // read next 100 files
            setTimeout(() => scanFolder(reader, entries.concat(entriesToArray(results))));
        } else {
            filterEntries(entries, scanned);
            scanNextFolder();
        }
        // fail callback
    }, scanNextFolder.bind(this));
}

const scanEntries = (reader) => { // fail callback
    reader.readEntries(scanFolder.bind(this, reader), scanNextFolder.bind(this));
}

const scanNextFolder = () => {
    if (scanned.folders && scanned.folders.length) {
        scanEntries(scanned.folders.pop());
    } else {
        scanned && scanned.endCb && scanned.endCb(scanned);
    }
}

const scanEntriesSync = (entries, folderDTO, endCb) => {
    scanned = filterEntries(entries, Object.assign(folderDTO, {
        foldersCount: 0,
        totalFiles: 0,
        files: [],
        folders: [],
        endCb: endCb,
    }));

    scanNextFolder(scanned);
}

const getPath = (_fileName, ingestion, dirPath = "") => 'something/path'//this.path || `/${ingestion.type[0]}/${ingestion.name}/${moment().format("YYYY/MM/DD")}${dirPath}`;

const getName = (_file, saltedName, _isXLS) => saltedName;

const getType = (file) => file.type;

/**
 * Scanning using e.target && e.target.files
 * @param {*} files
 * @param {*} folderDTO
 */
const scanFileList = (files, folderDTO) => {
    folderDTO = folderDTO || {};
    return new Promise((resolve) => {
        if (files) {
            resolve(Object.assign(folderDTO, {
                files: filterFiles(files, folderDTO),
                totalFiles: files.length,
                foldersCount: 1,
            }));
        } else {
            resolve(folderDTO);
        }
    });
}

const convertDataTransferFileListToArray = (files) => {
    var knownFiles = [];

    // If not already a list, make it a list
    if (!files.length) {
        files = [files];
    }

    // Iterate manually to accommodate Array, FileList, DataTransferItemList
    for (let i = 0; i < files.length; i++) {
        let file = files[i];

        if (Blob && file instanceof Blob) {
            // Safari, Firefox, IE land here
            knownFiles.push(file);
        } else if (file.webkitGetAsEntry) {
            // Chrome wraps Files in DataTransferItems
            knownFiles.push(file.webkitGetAsEntry());
        }
    }

    return knownFiles;
}

/**
 * Scanning using e.dataTransfer && e.dataTransfer.items
 * @param {*} items
 * @param {*} folderDTO
 */
const scanDataTransferItemList = (items, folderDTO) => {
    folderDTO = folderDTO || {};
    return new Promise((resolve) => {
        if (items) {
            // e.dataTransfer.items isn't enumerable
            scanEntriesSync(
                convertDataTransferFileListToArray(items),
                folderDTO,
                (data) => {
                    delete folderDTO.folders;
                    delete folderDTO.endCb;

                    resolve(Object.assign(folderDTO, {
                        files: data.files,
                        totalFiles: data.totalFiles,
                        foldersCount: data.foldersCount,
                    })
                );
            });
        } else {
            resolve(folderDTO)
        }
    });
}

export {
    scanFileList,
    scanDataTransferItemList
}


    // addFolder(folderDTO) {
    //     folderDTO = folderDTO || FolderDTO.of(this.ingestion);
    //     this.scannedFolders.push(folderDTO);
    //     return folderDTO;
    // }

    // removeFolder(folderDTO) {
    //     if (folderDTO) {
    //         this.scannedFolders.splice(this.scannedFolders.indexOf(folderDTO), 1);
    //         folderDTO.isRemoved = true; // to break all processes depending on it;
    //     }
    // }

    // uploadFolder(arr) {
    //     if (!this.isReady) {
    //         return; // we stop uploading
    //     }

    //     this.selectedFolder.bites.startTime = new Date().getTime();
    //     this.selectedFolder.ingestion = this.ingestion;
    //     let interval = setInterval(this.bitesPerSecond.bind(this), 10000);

    //     arr.forEach((c) => c.state = STATE_PENDING);

    //     async.eachSeries(arr, this.uploadFolderObj.bind(this), () => {
    //         clearInterval(interval);
    //         if (!this.isReady) {
    //             return; // we stop uploading
    //         }

    //         this.selectedFolder.bites = { total: 0, perFile: 0 };
    //     });
    // }

    // retryNow() {
    //     clearTimeout(this.selectedFolder.currentUpload.timeoutObj);
    //     this.selectedFolder.currentUpload.timeout = 0;
    //     this.selectedFolder.currentUpload.timeoutCall();
    // }

    // manageFiles(e, strategyProvider = this.folder) {
    //     this.isScanning = true;

    //     this.removeFolder(this.selectedFolder);
    //     this.selectedFolder = this.addFolder(undefined);
    //     this.selectedFolder.strategy = strategyProvider;

    //     if (this.selectedFolder.strategy.regex) {
    //         this.selectedFolder.strategy.regex = new RegExp(this.selectedFolder.strategy.regex);
    //     }

    //     e.preventDefault();

    //     strategyProvider.scan(e, this.selectedFolder).then((data) => {
    //         this.scanned = data;
    //         this.isScanning = false;
    //     });
    // }

