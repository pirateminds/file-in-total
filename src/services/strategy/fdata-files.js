import { FolderFiles } from "./folder-files";

export class FDataFiles extends FolderFiles {
    typeName = "F";
    isCustomFiles = false;
    shouldRetry = true;

    filterFiles(obj, folderDTO) {
        let items = [];

        // tslint:disable-next-line:forin
        for (let o in obj) {
            o = obj[o];
            // tslint:disable-next-line:no-null-keyword
            items.push(this.addItem(o, null, folderDTO));
        }

        return items.filter(i => this.filterFile(i.item, undefined));
    }

    filterFile(entry, metadata) {
        return (metadata ? metadata.size : entry.size) && (entry.relativePath || entry.webkitRelativePath || entry.name).endsWith(".csv");
    }

    getPath(fileName, ingestion) {
        return super.getPath(fileName, ingestion, `/${fileName.replace(".csv", "")}`);
    }

    getType() {
        return "text/csv";
    }
}
