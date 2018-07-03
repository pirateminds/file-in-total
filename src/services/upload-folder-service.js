import { UploadFile } from "./upload-file";

import { FolderFiles } from "./strategy/folder-files";
import { FolderDTO, FileDTO, STATE_COMPLETED, STATE_PENDING, STATE_IN_PROGRESS } from "./dto/data-transfer";

export * from "./strategy/fdata-files";
export * from "./strategy/sdata-files";
export * from "./strategy/tdata-files";
export * from "./strategy/folder-files";

import async from "async";

// rename to FileManager
export class UploadFolderService {
    scanned;
    isScanning;
    ingestion;
    speedLimit;
    selectedFolder;
    isReady;
    folder;
    uploadFile;
    scannedFolders = [];

    // tslint:disable-next-line:member-ordering
    static inject = [UploadFile, FolderFiles];

    constructor(uploadFile, folder) {
        this.uploadFile = uploadFile;
        this.folder = folder;
    }

    // #trotteling TODO extract trotteling as service
    bitesPerSecond() {
        if (!this.isReady) {
            return; // we stop uploading
        }

        let bites = this.selectedFolder.bites.total + this.selectedFolder.bites.perFile;
        let time = new Date();
        time.setTime(new Date().getTime() - this.selectedFolder.bites.startTime);
        this.selectedFolder.bites.perSeconds = bites / (time.getSeconds() || 1);
    }

    throttle(callback) {
        this.bitesPerSecond();

        if (this.selectedFolder.bites.perSeconds <= parseInt(this.speedLimit, 10)) {
            callback();
        } else {
            setTimeout(callback, this.selectedFolder.bites.perSeconds / parseInt(this.speedLimit, 10) * 1000);
        }
    }

    // #trotteling

    // #upload-file TODO extract to upload file service
    uploadFileItem(entryDTO, file, callback) {
        if (!this.isReady) {
            return callback(); // we stop uploading
        }

        this.throttle(() => {
            this.uploadFile.upload(FileDTO.of(file, entryDTO, () => callback()));
        });
    }

    uploadEntry(entryDTO, callback) {
        if (!this.isReady) {
            return callback(); // we stop uploading
        }

        entryDTO.item.file((file) => {
            this.uploadFile.uploadXLS(FileDTO.of(file, entryDTO, () => {
                entryDTO.isDone = true;
                entryDTO.state = STATE_COMPLETED;

                callback();
            }));
        });
    }

    // #upload-file

    // #upload-folder TODO extract to upload folder service
    uploadItem(entryDTO, callback) {
        if (!this.isReady) {
            return callback(); // we stop uploading
        }

        if (entryDTO.subDir.isDirectory) {
            let reader = entryDTO.subDir.createReader();
            // tslint:disable-next-line:no-null-keyword
            this.uploadFile.readFolderAndProcessFilesSync(reader, entryDTO, null, this.uploadFileItem.bind(this), callback);
        } else {
            entryDTO.count = entryDTO.subDir.length;
            async.eachSeries(entryDTO.subDir, this.uploadFileItem.bind(this, entryDTO), callback);
        }
    }

    uploadFolderObj(entryDTO, callback) {
        if (!this.isReady) {
            return callback(); // we stop uploading
        }

        this.selectedFolder.currentUpload = entryDTO;
        entryDTO.state = STATE_IN_PROGRESS;

        // get file to receive XML name
        entryDTO.item.file((file) => {
            // check folder name already exists, or generate new one
            this.uploadFile.getFolderMeta(FileDTO.of(file, entryDTO, () => {
                // uloads wav first for wav scenario
                if (entryDTO.subDir) { // wav scenario
                    entryDTO.retryFirstFile = true;
                    this.uploadItem(entryDTO, () => {
                        entryDTO.uploaded -= 1;
                        // upload xml
                        this.uploadEntry(entryDTO, callback);
                    });
                } else {
                    // upload xml
                    this.uploadEntry(entryDTO, callback);
                }
            }));
        });

    }

    // #upload-folder

    addFolder(folderDTO) {
        folderDTO = folderDTO || FolderDTO.of(this.ingestion);
        this.scannedFolders.push(folderDTO);
        return folderDTO;
    }

    removeFolder(folderDTO) {
        if (folderDTO) {
            this.scannedFolders.splice(this.scannedFolders.indexOf(folderDTO), 1);
            folderDTO.isRemoved = true; // to break all processes depending on it;
        }
    }

    uploadFolder(arr) {
        if (!this.isReady) {
            return; // we stop uploading
        }

        this.selectedFolder.bites.startTime = new Date().getTime();
        this.selectedFolder.ingestion = this.ingestion;
        let interval = setInterval(this.bitesPerSecond.bind(this), 10000);

        arr.forEach((c) => c.state = STATE_PENDING);

        async.eachSeries(arr, this.uploadFolderObj.bind(this), () => {
            clearInterval(interval);
            if (!this.isReady) {
                return; // we stop uploading
            }

            this.selectedFolder.bites = { total: 0, perFile: 0 };
        });
    }

    retryNow() {
        clearTimeout(this.selectedFolder.currentUpload.timeoutObj);
        this.selectedFolder.currentUpload.timeout = 0;
        this.selectedFolder.currentUpload.timeoutCall();
    }

    manageFiles(e, strategyProvider = this.folder) {
        this.isScanning = true;

        this.removeFolder(this.selectedFolder);
        this.selectedFolder = this.addFolder(undefined);
        this.selectedFolder.strategy = strategyProvider;

        if (this.selectedFolder.strategy.regex) {
            this.selectedFolder.strategy.regex = new RegExp(this.selectedFolder.strategy.regex);
        }

        e.preventDefault();

        strategyProvider.scan(e, this.selectedFolder).then((data) => {
            this.scanned = data;
            this.isScanning = false;
        });
    }
}
