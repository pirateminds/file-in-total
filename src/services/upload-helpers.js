import path from "path";

export const MINIMAL_TIMEOUT = 30;

export default {
    calcETA(f, b, e) {
        f.progress = f.progress || { timePerFile: 0, timeLeft: 0 };
        let cur = f.currentFile;
        let prog = f.progress;

        if (e.lengthComputable) {
            cur.progress = e.loaded / e.total;
            b.perFile = e.loaded;
        }

        if (prog.timePerFile === 0 && cur.progress !== 0) {
            prog.timePerFile = 100 / cur.progress * (new Date().getTime() - cur.timestamp);
        }

        prog.timeLeft = prog.timePerFile * (f.count - f.uploaded);
        prog.timeLeft -= new Date().getTime() - cur.timestamp;

        prog.timePerCurFile = (1 - cur.progress) * (new Date().getTime() - cur.timestamp);
    },

    updateFileETA(f) {
        f.progress = f.progress || { timePerFile: 0, timeLeft: 0 };
        f.progress.timePerFile = Math.round((f.progress.timePerFile + new Date().getTime() - f.currentFile.timestamp) / 2);
    },

    appendErrToLogs(obj, err) {
        obj.logs = obj.logs || [];
        let item = obj.logs.find((c) => c.message === (err.error && err.error.message || c.message === err.message));
        if (item) {
            item.count += 1;
        } else {
            if (obj.logs.length < 10001) {
                obj.logs.push(Object.assign({ count: 1 }, err.error && err.error.message ? err.error : err));
            }
        }
    },

    isItWarning(err) {
        console.log(err);
        return err && ~err.error.message.indexOf("is not registered in this upload");
    },

    setDefaultUploadingStats() {
        return {
            progress: 0,
            timestamp: new Date().getTime(),
        };
    },

    wrapFile(file) {
        let data = new FormData();
        data.append("file", file);

        return data;
    },

    removeFromArr(arr, val) {
        arr.splice(arr.indexOf(val), 1);
    },

    getName(name) {
        return path.basename(name, path.extname(name));
    },

    getExt(name) {
        return path.extname(name);
    },

    getNameSalted(name, times) {
        return times ? `${this.getName(name)}_${times}` : this.getName(name);
    },

    getNameSaltedAndExt(name, times) {
        return this.getNameSalted(name, times) + this.getExt(name);
    },

    entriesToArray(list) {
        return Array.prototype.slice.call(list || [], 0);
    },
};
