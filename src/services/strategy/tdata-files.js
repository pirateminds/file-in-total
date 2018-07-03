import { moment } from "@pg/htmlkit";
import { EntryDTO } from "../dto/data-transfer";

export class TDataFiles {
    currentUpload;
    currentFolderLevel;
    nextFolderLevel;
    scanned;
    typeName = "T";

    setDefault(folderDTO) {
        this.scanned = Object.assign(folderDTO, {
            foldersCount: 0,
            totalFiles: 0,
            files: [],
            folders: [],
        });

        this.nextFolderLevel = [];
        this.currentFolderLevel = [];
        this.currentUpload = EntryDTO.of({ folderDTO: folderDTO });
    }

    filterFiles(obj, folderDTO) {
        let items = [];
        // tslint:disable-next-line:no-null-keyword
        let o = null;

        // tslint:disable-next-line:forin
        for (o in obj) {
            o = obj[o];

            if (o.name && (o.name.endsWith("xlsx") || o.name.endsWith("xls"))) {
                items.push(EntryDTO.of({
                    item: o,
                    ext: o.name.substr(o.name.lastIndexOf(".") + 1),
                    subDir: [],
                    folder: (o.relativePath || o.webkitRelativePath).replace(o.name, "") + "wav/",
                    itemName: (o.relativePath || o.webkitRelativePath).replace(o.name, "") + "wav/",
                    folderDTO: folderDTO,
                }));
            }
        }

        // tslint:disable-next-line:forin
        for (o in obj) {
            o = obj[o];

            let isWav = o.name && o.type === "audio/wav";
            if (isWav) {
                let folder = (o.relativePath || o.webkitRelativePath).replace(o.name, "");
                items.find((j) => {
                    if (j.folder === folder) {
                        j.subDir.push(o);
                    }
                });
            }
        }

        return items.filter((i) => i.size);
    }

    listEntries(reader, entries) {
        for (let entry of entries) {

            if (entry.isDirectory) {
                if (entry.name.toLowerCase() === "wav") {
                    this.currentUpload.subDir = entry;
                } else {
                    this.nextFolderLevel.push(entry.createReader());
                }
            } else {
                if (entry.name.endsWith("xlsx") || entry.name.endsWith("xls")) {
                    this.currentUpload.item = entry;
                }
                this.scanned.totalFiles += 1;
            }
        }

        if (entries.length) {
            setTimeout(() => this.readEntries(reader, this.readNextLevel.bind(this)));
        } else {
            if (this.currentUpload.subDir && this.currentUpload.item) {
                let obj = this.currentUpload;
                this.scanned.files.push(obj);
                this.currentUpload = EntryDTO.of({ folderDTO: this.scanned });
            }

            setTimeout(() => this.readNextLevel());
        }
    }

    readEntries(reader, _next) {
        reader.readEntries(this.listEntries.bind(this, reader), this.readNextLevel.bind(this));
    }

    readNextLevel() {
        if (this.currentFolderLevel.length) {
            this.scanned.foldersCount += 1;
            this.readEntries(this.currentFolderLevel.pop(), this.readNextLevel.bind(this));
        } else {
            this.currentFolderLevel = this.nextFolderLevel;
            if (!this.currentFolderLevel.length) { // read next endpoint
                return this.scanned.endCb({ files: this.scanned.files });
            }
            this.nextFolderLevel = [];
            setTimeout(() => this.readNextLevel());
        }
    }

    scanEntriesSync(entries, endCb) {
        Object.assign(this.scanned, { endCb: endCb });

        entries.forEach((e) => {
            // if drag some items from webstorm for example
            // entry may be null
            if (e && e.isDirectory) {
                this.nextFolderLevel.push(e.createReader());
            }
        });

        this.readNextLevel();
    }

    scan(e, folderDTO) {
        this.setDefault(folderDTO);

        return new Promise((resolve) => {
            if (e.target && e.target.files) {
                resolve(Object.assign(folderDTO, {
                    files: this.filterFiles(e.target.files, folderDTO),
                    totalFiles: e.target.files.length,
                    foldersCount: 1,
                }));
            }

            // e.dataTransfer.items isn't enumerable
            if (e.dataTransfer && e.dataTransfer.items) {
                this.scanEntriesSync($.map(e.dataTransfer.items, (value) => [value]).map((e) => e.webkitGetAsEntry()), (data) => {
                    delete folderDTO.folders;

                    resolve(Object.assign(folderDTO, {
                        files: data.files,
                        totalFiles: this.scanned.totalFiles,
                        foldersCount: this.scanned.foldersCount,
                    }));
                });
            }
        });
    }

    getPath(fileName, ingestion) {
        return `/${ingestion.type[0]}/${ingestion.name}/${moment().format("YYYY/MM/DD")}/${fileName}`;
    }

    getName(file, saltedName, isXLS) {
        return isXLS ? saltedName : "/wav/" + file.name;
    }

    getType(file, isXLS) {
        return isXLS ? "application/vnd.ms-excel" : file.type;
    }
}
