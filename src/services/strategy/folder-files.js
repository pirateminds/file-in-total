import { EntryDTO } from "../dto/data-transfer";
import { moment } from "@pg/htmlkit";

export class FolderFiles {
    path;
    scanned;
    typeName = "Custom Data";
    isCustomFiles = true;
    // tslint:disable-next-line:no-null-keyword
    regex = null;
    shouldRetry = false;

    // it's for just file picker upload, without drag and drop
    addItem(item, metadata, obj) {
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

    entriesToArray(list) {
        return Array.prototype.slice.call(list || [], 0);
    }

    filterFiles(obj, folderDTO) {
        let items = [];

        // tslint:disable-next-line:forin
        for (let o in obj) {
            o = obj[o];
            // tslint:disable-next-line:no-null-keyword
            items.push(this.addItem(o, null, folderDTO));
        }

        return items.filter((i) => i.item.size);
    }

    filterFile(entry, metadata) {
        return (metadata ? metadata.size : entry.size) && (!this.regex || this.regex && (this.regex).test(entry.relativePath || entry.webkitRelativePath || entry.name));
    }

    filterEntries(entries, obj = { foldersCount: 0, files: [], folders: [] }) {
        entries.forEach((entry) => {
            if (!entry) {
                return;
            }

            if (entry.isFile) {
                obj.totalFiles += 1;
                entry.getMetadata((metadata) => {
                    if (this.filterFile(entry, metadata)) {
                        obj.files.push(this.addItem(entry, metadata, obj));
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

    scanFolder(reader, entries) {
        entries = entries || [];
        reader.readEntries((results) => {
            // This recursion, it works cause we receive just an links array
            // We upload files one by one
            // The uploaded one removed from memory
            if (results.length) { // read next 100 files
                setTimeout(() => this.scanFolder(reader, entries.concat(this.entriesToArray(results))));
            } else {
                this.filterEntries(entries, this.scanned);
                this.scanNextFolder();
            }
            // fail callback
        }, this.scanNextFolder.bind(this));
    }

    scanEntries(reader) { // fail callback
        reader.readEntries(this.scanFolder.bind(this, reader), this.scanNextFolder.bind(this));
    }

    scanNextFolder() {
        if (this.scanned.folders && this.scanned.folders.length) {
            this.scanEntries(this.scanned.folders.pop());
        } else {
            this.scanned && this.scanned.endCb && this.scanned.endCb(this.scanned);
        }
    }

    scanEntriesSync(entries, folderDTO, endCb) {
        this.scanned = this.filterEntries(entries, Object.assign(folderDTO, {
            foldersCount: 0,
            totalFiles: 0,
            files: [],
            folders: [],
            endCb: endCb,
        }));
        this.scanNextFolder();
    }

    scan(e, folderDTO) {
        folderDTO = folderDTO || {};
        return new Promise((resolve) => {
            if (e.target && e.target.files) {
                resolve(Object.assign(folderDTO, {
                    files: this.filterFiles(e.target.files, folderDTO),
                    totalFiles: e.target.files.length,
                    foldersCount: 1,
                }));
            }

            if (e.dataTransfer && e.dataTransfer.items) {
                // e.dataTransfer.items isn't enumerable
                this.scanEntriesSync($.map(e.dataTransfer.items, (value) => [value]).map((e) => e.webkitGetAsEntry()), folderDTO, (data) => {
                    delete folderDTO.folders;
                    delete folderDTO.endCb;

                    resolve(Object.assign(folderDTO, {
                        files: data.files,
                        totalFiles: data.totalFiles,
                        foldersCount: data.foldersCount,
                    }));
                });
            }
        });
    }

    getPath(_fileName, ingestion, dirPath = "") {
        return this.path || `/${ingestion.type[0]}/${ingestion.name}/${moment().format("YYYY/MM/DD")}${dirPath}`;
    }

    getName(_file, saltedName, _isXLS) {
        return saltedName;
    }

    getType(file) {
        return file.type;
    }
}
