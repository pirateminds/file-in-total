import React, { Component } from 'react';
import './App.css';
import {FilePicker} from './components/FilePicker';
import { scanFileList, scanDataTransferItemList } from './scanner/scanner';

class App extends Component {
    state = {
        files: [],
        foldersCount: 0,
        totalFiles: 0
    }
    onFileList = (files) => {
        console.log(files)
        scanFileList(files).then(result => {
            console.log(result)
            this.setState({
                ...result
            })
        }).catch(err=> console.log(err));
    }

    onDataTransferItemList = (files) => {
        console.log(files);
        const FolderDTO = {
            files: [],
            foldersCount: 0,
            totalFiles: 0
        }
        clearInterval(this.intervalHander);

        this.intervalHander = setInterval(()=> {
            this.setState({
                foldersCount: FolderDTO.foldersCount,
                totalFiles: FolderDTO.totalFiles,
            });
        }, 50);

        scanDataTransferItemList(files, FolderDTO).then(result => {
            console.log(result);
            clearInterval(this.intervalHander);
            this.setState({
                ...result
            });
        }).catch(err=> console.log(err));
    }

    render() {
        const { files, foldersCount, totalFiles } = this.state;
        return (
        <div className="App">
            <FilePicker
                className="file-picker"
                onFileList={this.onFileList}
                onDataTransferItemList={this.onDataTransferItemList} />
            <div className="title">
                Files: <b>{files.length}</b>/{totalFiles}, Folders: {foldersCount}
            </div>
            <table>
            {
                files.map(e=> {
                    return <tr key={e.item.fullPath}>
                        <td>{e.itemName}</td>
                        <td>
                            <small>{e.ext}</small>
                        </td>
                        <td>
                            <small>{e.metadata.size}</small>
                        </td>
                    </tr>
                })
            }
            </table>
        </div>
        );
    }
}

export default App;
