export const bitesPerSecond = (dto) => {
    if (!dto.isReady) {
        return; // we stop uploading
    }

    let bites = dto.selectedFolder.bites.total + dto.selectedFolder.bites.perFile;
    let time = new Date();
    time.setTime(new Date().getTime() - dto.selectedFolder.bites.startTime);
    dto.selectedFolder.bites.perSeconds = bites / (time.getSeconds() || 1);
}

export const throttle = (dto, callback) => {
    bitesPerSecond(dto);

    if (dto.selectedFolder.bites.perSeconds <= parseInt(dto.speedLimit, 10)) {
        callback();
    } else {
        setTimeout(callback, dto.selectedFolder.bites.perSeconds / parseInt(dto.speedLimit, 10) * 1000);
    }
}
