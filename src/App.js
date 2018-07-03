import React, { Component } from 'react';
import numeral from 'numeral';
import './App.css';
import { RadioGroup, Radio } from 'react-radio-group';
import { FilePicker } from './components/FilePicker';
import { scanFileList, scanDataTransferItemList } from './scanner/scanner';

const formatNumberToUserFirendlyBites = (number) => numeral(number).format('0.000b');
const formatNumberToUserFirendlyNumber = (number) => numeral(number).format('0.0[0000]');
const formatTimestampToUserFirendlyTime = (number) => numeral(number / 1000).format('00:00:00');

const mesureTime = (time) => {
    const t0 = time || performance.now();
    return ()=> performance.now() - t0;
};

const calcFPS = (files, timestamp) => files.length / (timestamp / 1000);

const defaultState = () => ({
    files: [],
    filesToRender: [],
    filesCount: 0,
    foldersCount: 0,
    totalFiles: 0,
    fps: 0,
    time: 0,
});

class App extends Component {
    state = Object.assign({
        selectedValue: true,
    }, defaultState());

    updateState(result, timestamp) {
        const filesCount = result.files.length;
        const filesToRender = filesCount > 100 ? [].concat(result.files) : result.files;

        if (filesCount > 100) {
            filesToRender.length = 100;
        }

        this.setState({
            ...result,
            filesToRender,
            filesCount,
            fps: calcFPS(result.files, timestamp),
            time: timestamp,
        });
    }
    onFileList = (files) => {
        console.log(files)
        this.updateState(defaultState(), 1);
        const mesure = mesureTime();
        scanFileList(files).then(result => {
            const timestamp = mesure();
            this.updateState(result, timestamp);
        }).catch(err=> console.log(err));
    }

    onDataTransferItemList = (files) => {
        const FolderDTO = defaultState();
        this.updateState(FolderDTO, 1);

        console.log(files);

        clearInterval(this.intervalHander);
        let mesure = mesureTime();
        this.intervalHander = setInterval(()=> {
            const timestamp = mesure();
            this.setState({
                filesCount: FolderDTO.files.length,
                foldersCount: FolderDTO.foldersCount,
                totalFiles: FolderDTO.totalFiles,
                fps: calcFPS(FolderDTO.files, timestamp),
                time: timestamp,
            });

            mesure = mesureTime(timestamp);
        }, 100);

        scanDataTransferItemList(files, FolderDTO).then(result => {
            const timestamp = mesure();
            console.log(result);
            clearInterval(this.intervalHander);
            this.updateState(result, timestamp);
        }).catch(err=> console.log(err));
    }

    onTypeChange = (e) => {
        this.setState({
            selectedValue: e,
        });
    }

    render() {
        const { filesToRender, filesCount, foldersCount, totalFiles, fps, time } = this.state;

        return (
        <div className="app">
            <div className="app-header">
                <div className="type-picker">
                    <RadioGroup name="filepicket" selectedValue={this.state.selectedValue} onChange={this.onTypeChange}>
                        <label>
                            <Radio value={false} />Single
                        </label>
                        <label>
                            <Radio value={true} />Multiple
                        </label>
                    </RadioGroup>
                </div>
                <FilePicker
                    className="file-picker"
                    multiple={this.state.selectedValue}
                    onFileList={this.onFileList}
                    onDataTransferItemList={this.onDataTransferItemList} />
                <div className="app-metrics">
                    <div>
                        files: <b>{filesCount}</b>/{totalFiles}, folders: {foldersCount}
                    </div>
                    <div className="app-metrics__gap" />
                    <div className="app-metrics__fps">
                        files per second: {formatNumberToUserFirendlyNumber(fps)}, time: {formatTimestampToUserFirendlyTime(time)}
                    </div>
                </div>
            </div>
            <table className="table">
                <thead>
                    <tr>
                        <th className="table-name">
                            <div>Name</div>
                        </th>
                        <th className="table-ext">
                            <div>Extension</div>
                        </th>
                        <th className="table-size">
                            <div>Size</div>
                        </th>
                    </tr>
                </thead>
            </table>
            <div className="table-conter__wr">
                <table className="table">
                    <tbody>
                    {
                        filesToRender.map(e=> {
                            return <tr key={e.item.fullPath || e.itemName}>
                                <td className="table-name">
                                    <div>{e.itemName}</div>
                                </td>
                                <td className="table-ext">
                                    <small>{e.ext}</small>
                                </td>
                                <td className="table-size">
                                    <small>{formatNumberToUserFirendlyBites(e.metadata && e.metadata.size || 0)}</small>
                                </td>
                            </tr>
                        })
                    }
                    </tbody>
                </table>
            </div>
        </div>
        );
    }
}

export default App;
