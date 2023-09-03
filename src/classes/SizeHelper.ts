export class SizeHelper {
	_cache;
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
	setSizeOf(index, val) {
		this._cache[index] = val;
		this._relaodfunction(index);

		// const needsReload = this._cache[index] == null;
		//if (needsReload) {
		//if (this._reloadStartingIndex == -1 || this._reloadStartingIndex > index)
		//	this._reloadStartingIndex = index;
		// this.reloadGrid();
		//}
	}

	getSizeOf(index) {
		// console.log('sizeof', index, 'is', this._cache[index]);
		return this._cache[index];
	}
	clear(index) {
		delete this._cache[index];
	}
	clearAll() {
		this._cache = {};
	}
}
export default SizeHelper;
