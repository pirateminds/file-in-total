import React from 'react';
import PropTypes from 'prop-types';

export class FilePicker extends React.Component {
    static propTypes = {
        onFileList: PropTypes.func.isRequired,
        onDataTransferItemList: PropTypes.func.isRequired,
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
        const { className, id } = this.props;
        const filtredProps = {
            className,
            id
        }
        return <input {...filtredProps} type="file" name="files[]" onChange={this.onChange} onDrop={this.onDrop}
                multiple webkitdirectory mozdirectory odirectory msdirectory directory />
    }
}
