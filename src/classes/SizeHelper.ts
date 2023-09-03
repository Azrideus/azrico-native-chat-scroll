export class SizeHelper {
	static BUFFER_HEIGHT = 40;
	_cache;
	_avgSize;
	_relaodfunction;
	_reloadPromise;
	_isWaitingForReload = false;

	_reloadStartingIndex = -1;

	constructor(rldf: any = null) {
		this.clearAll();
		this.setReloadFunction(rldf);
	}
	setReloadFunction(val) {
		this._relaodfunction = val;
	}
	setSizeOf(index, actualindex, val) {
		this._cache[actualindex] = val;
		this._avgSize = ((this._avgSize || val) + val) / 2;
		this._relaodfunction(index);

		// const needsReload = this._cache[index] == null;
		//if (needsReload) {
		//if (this._reloadStartingIndex == -1 || this._reloadStartingIndex > index)
		//	this._reloadStartingIndex = index;
		// this.reloadGrid();
		//}
	}
	getAverageSize() {
		return this._avgSize || SizeHelper.BUFFER_HEIGHT;
	}
	getSizeOf(actualindex) {
		return this._cache[actualindex];
	}
	clear(actualindex) {
		delete this._cache[actualindex];
	}

	clearAll() {
		this._avgSize = 0;
		this._cache = {};
	}
}
export default SizeHelper;
