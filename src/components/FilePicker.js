import React from 'react';
import PropTypes from 'prop-types';

export class FilePicker extends React.Component {
    static propTypes = {
        onFileList: PropTypes.func.isRequired,
        onDataTransferItemList: PropTypes.func.isRequired,
        multiple: PropTypes.bool,
    }

    onChange = (e) => {
        e.preventDefault();
        if (e.target && e.target.files) {
            this.props.onFileList(e.target.files);
        }
    }

    onDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.items) {
            this.props.onDataTransferItemList(e.dataTransfer.items);
        }
    }

    render() {
        const { className, id, multiple, onFileList, onDataTransferItemList, ...rest } = this.props;
        const filtredProps = {
            className,
            id,
            ...rest,
        }
        return multiple ? <input
            {...filtredProps}
            type="file"
            name="files[]"
            onChange={this.onChange}
            onDrop={this.onDrop}

            multiple={'true'}
            webkitdirectory={'true'}
            mozdirectory={'true'}
            odirectory={'true'}
            msdirectory={'true'}
            directory={'true'}
        />: <input
            {...filtredProps}
            type="file"
            name="files[]"
            onChange={this.onChange}
            onDrop={this.onDrop}
        />
    }
}
