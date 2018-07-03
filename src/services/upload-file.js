import Resumable from "resumablejs";
import async from "async";
import mime from "mime";
import path from "path";
import FilesApi from "../api";
import helpers from "./upload-helpers";

import {Config} from "../../../services/config";
import {CurrentUser} from "../../../services/current-user";
import {createHeadersObjectWithCsrf} from "../../../services/csrf";

export class UploadFile {
    helpers;
    api;
    user;
    baseUrl;
    sigintBasePath;
    config;
    // tslint:disable-next-line:member-ordering
    static inject = [Config, CurrentUser, FilesApi];

    constructor(config, user, api) {
        this.config = config;
        this.sigintBasePath = config.getSigintApiBasePath();
        this.baseUrl = config.getBaseUrl();
        this.helpers = helpers;
        this.user = user;
        this.api = api;
    }

    cleunUpResumble(resumable) {
        resumable.cancel();

        resumable.events.length = 0;
    }

    processFile(id, file, entryDTO, bites, callback) {
        let folderDTO = entryDTO.folderDTO;

        let resumable = new (Resumable)({
            target: `${this.baseUrl}upload-sigint/files/${id}/chunks`,
            forceChunkSize: true,
            permanentErrors: [400, 404, 415],
            simultaneousUploads: 1,
            testChunks: false,
            chunkSize: 256000000, // 7 mb
            headers: createHeadersObjectWithCsrf,
        });

        resumable.on("fileSuccess", () => {
            entryDTO.uploaded += 1;

            this.helpers.updateFileETA(entryDTO);

            bites.total += bites.perFile;
            bites.perFile = 0;

            this.helpers.removeFromArr(folderDTO.resumables, resumable);
            this.cleunUpResumble(resumable);

            // tslint:disable-next-line:no-null-keyword
            entryDTO.isXLS = null;
            // tslint:disable-next-line:no-unused-expression
            callback && callback({ result: { id: id } });
        });

        resumable.on("fileProgress", (file) => {
            if (folderDTO.isCanceled) {
                return resumable.cancel();
            }

            this.helpers.calcETA(entryDTO, bites, {
                lengthComputable: true,
                loaded: resumable.getSize() * resumable.progress(),
                total: file.size,
            });

            if (entryDTO.metadata) {
                this.helpers.updateFileETA(entryDTO);
                bites.perFile = entryDTO.metadata.uploaded = resumable.getSize() * resumable.progress();
            }
        });

        resumable.on("fileError", (_file, message) => {
            entryDTO.errors += 1;
            entryDTO.retries = entryDTO.retries || 0;

            this.helpers.updateFileETA(entryDTO);
            this.helpers.appendErrToLogs(entryDTO, formatErrMessage(message));

            bites.total += bites.perFile;
            bites.perFile = 0;

            entryDTO.timeout = 0;

            this.helpers.removeFromArr(folderDTO.resumables, resumable);
            this.cleunUpResumble(resumable);

            // tslint:disable-next-line:no-unused-expression
            callback && callback();
        });

        resumable.assignDrop({
            addEventListener: (_t, l, _u) => {
                l.call(this, {
                    stopPropagation: () => undefined,
                    preventDefault: () => undefined,
                    dataTransfer: {
                        files: [file],
                    },
                });
            },
        });

        folderDTO.resumables = folderDTO.resumables || [];
        folderDTO.resumables.push(resumable);
        setTimeout(() => resumable.upload(), 0);
    }

    // Cause we have dummy backend developers
    // they can`t follow the one common scenario in all services
    getSourcesMetadata(ingestion) {
        return ["S", "F"].includes(ingestion.type) ? {
            "dataSourceType": ingestion.type,
            "subSourceType": ingestion.recordType,
        } : {
            "dataSourceType": ingestion.recordType,
            "subSourceType": ingestion.type,
        };
    }

    upload(fileDTO) {
        let entryDTO = fileDTO.entryDTO;
        let ingestion = fileDTO.ingestion || {};
        let file = fileDTO.file;
        entryDTO.currentFile = this.helpers.setDefaultUploadingStats();

        // TData have subDir (wav), we that files to one folder same name as file
        // SData have no subDir and the name convention is different
        entryDTO.uploadPath = entryDTO.uploadPath || fileDTO.getPath();
        entryDTO.uploadFilePath = path.join("/", entryDTO.uploadPath, fileDTO.getName());

        let params = {
            "meta": {
                properties: this.getSourcesMetadata(ingestion),
                "isProcessed": false,
                "service": "ingestion",
            },
            owner: this.user.account.id,
            // tslint:disable-next-line:no-null-keyword
            "source_id": ingestion && ingestion.id || null,
            "name": entryDTO.uploadFilePath,
            "type": fileDTO.getType() || mime.lookup(file.name),
        };

        this.api
            .createEmtyFile(params)
            .then((data) => {
                this.processFile(data.id, file, entryDTO, entryDTO.folderDTO.bites, (result) => {
                    entryDTO.retryFirstFile = undefined;
                    fileDTO.done(result);
                });

            }, this.handleFileCreationErrors.bind(this, {
                fileDTO,
                file,
                entryDTO,
            }));
    }

    handleFileCreationErrors({ fileDTO, file, entryDTO}, jqXHR, _textStatus, _err) {
        if ((entryDTO.retryFirstFile || fileDTO.isXLS) && jqXHR.responseJSON && jqXHR.responseJSON.error === "Conflict") {
            entryDTO.times = (entryDTO.times || 0) + 1;
            // tslint:disable-next-line:no-null-keyword
            entryDTO.uploadPath = null;

            if (jqXHR.responseJSON) {
                // tslint:disable-next-line:max-line-length
                this.helpers.appendErrToLogs(entryDTO, Object.assign(jqXHR.responseJSON, { message: `File with the "${this.helpers.getNameSaltedAndExt(file.name, entryDTO.times - 1)}" name already exists, saving as "${this.helpers.getNameSaltedAndExt(file.name, entryDTO.times)}"` }));
            }

            setTimeout(() => this.upload(fileDTO));
        } else {
            // stop the uploading and show error
            if (fileDTO.shouldRetry) {
                entryDTO.err = jqXHR.responseJSON && jqXHR.responseJSON.message;
            } else {
                // just increase counter for file upload
                this.helpers.updateFileETA(entryDTO);
                this.helpers.appendErrToLogs(entryDTO, jqXHR.responseJSON);
                entryDTO.errors += 1;
            }
            fileDTO.done();
        }
    }

    uploadXLS(fileDTO) {
        fileDTO.isXLS = true;
        this.upload(fileDTO);
    }

    readFolderAndProcessFilesSync(reader, entryDTO, entries, processCb, endCb) {
        entries = entries || [];
        reader.readEntries((results) => {
            // This recursion, it works cause we receive just an links array
            // We upload files one by one
            // The uploaded one removed from memory
            if (results.length) {
                setTimeout(() => this.readFolderAndProcessFilesSync(reader, entryDTO, entries.concat(this.helpers.entriesToArray(results)), processCb, endCb));
            } else {
                entryDTO.count = entries.length;
                async.eachSeries(entries, (entry, cb) => {
                    if (entry.isFile) {
                        entry.file((file) => processCb(entryDTO, file, cb));
                    } else {
                        cb();
                    }
                }, endCb);
            }
        }, endCb);
    }

    getFolderMeta(fileDTO, cb) {
        let entryDTO = fileDTO.entryDTO;
        fileDTO.isXLS = true;

        entryDTO.currentFile = this.helpers.setDefaultUploadingStats();

        // TData have subDir (wav), we that files to one folder same name as file
        // SData have no subDir and the name convention is different
        entryDTO.uploadPath = entryDTO.uploadPath || fileDTO.getPath();

        this.api.getFolderMeta(entryDTO.uploadPath)
            .then(() => {
                entryDTO.times = (entryDTO.times || 0) + 1;
                // tslint:disable-next-line:no-null-keyword
                entryDTO.uploadPath = null;

                setTimeout(() => this.getFolderMeta(fileDTO, cb));
            })
            .catch((err) => {
                console.log(err);
                fileDTO.done(err);
            });
    }
}

function formatErrMessage(message) {
    // sometime when upload server dead
    // the message come as string
    return typeof message === "string" ?
        { error: message, message } :
        JSON.parse(message);
}
