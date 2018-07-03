import helpers from "./helpers";

export const STATE_IN_PROGRESS = "In Progress";
export const STATE_PENDING = "Pending";
export const STATE_COMPLETED = "Completed";

export class FileDTO {
    isXLS;
    done;
    strategy;
    bites;
    folderDTO;
    entryDTO;
    ingestion;
    file;

    constructor(file, entryDTO, done) {
        this.file = file;
        this.ingestion = entryDTO.folderDTO.ingestion;
        this.entryDTO = entryDTO;
        this.folderDTO = entryDTO.folderDTO;
        this.bites = entryDTO.folderDTO.bites;
        this.strategy = this.folderDTO.strategy;

        this.done = done;
    }

    static of(file, entryDTO, done) {
        return new FileDTO(file, entryDTO, done);
    }

    getPath() {
        return this.strategy.getPath(helpers.getNameSalted(this.file.name, this.entryDTO.times), this.ingestion);
    }

    getName() {
        return this.strategy.getName(this.file, helpers.getNameSaltedAndExt(this.file.name, this.entryDTO.times), this.isXLS);
    }

    getType() {
        return this.strategy.getType(this.file, this.isXLS);
    }
}

export class EntryDTO {
    progress;
    resumables;
    warnings;
    errors;
    uploaded;
    constructor(data) {
        Object.assign(this, data);

        this.uploaded = 0;
        this.errors = 0;
        this.warnings = 0;

        this.resumables = [];

        this.progress = {
            timestamp: new Date().getTime(),
            timePerFile: 0,
            timeLeft: 0,
        };

        // var getDirName = (this.item.fullPath || this.item.webkitRelativePath).split('/');
        // getDirName.splice(getDirName.length - 1, 1);
        // this.dirName = getDirName.join('/');
    }

    static of(data) {
        return new EntryDTO(data);
    }
}

export class FolderDTO {
    bites;
    resumables;
    foldersCount;
    totalFiles;
    folders;
    files;
    ingestion;

    constructor(ingestion) {
        this.ingestion = ingestion;

        this.files = [];
        this.folders = [];
        this.totalFiles = 0;
        this.foldersCount = 0;

        this.resumables = [];
        this.bites = { total: 0, perFile: 0 };
    }

    static of(ingestion) {
        return new FolderDTO(ingestion);
    }
}
