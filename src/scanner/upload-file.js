const uploadFileItem = (entryDTO, file, callback) => {
    if (!this.isReady) {
        return callback(); // we stop uploading
    }

    this.throttle(() => {
        this.uploadFile.upload(FileDTO.of(file, entryDTO, () => callback()));
    });
}

const uploadEntry = (entryDTO, callback) => {
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
