const uploadItem = (entryDTO, callback) => {
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

const uploadFolderObj = (entryDTO, callback) => {
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
