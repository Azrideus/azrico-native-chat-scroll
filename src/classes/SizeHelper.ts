export class SizeHelper {
	_cache;
	_relaodfunction;
	_reloadPromise;
	_isWaitingForReload = false;

	_reloadStartingIndex = -1;

	constructor() {
		this.clearAll();
	}
	setReloadFunction(val) {
		this._relaodfunction = val;
	}
	setSizeOf(index, val) {
		const needsReload = this._cache[index] == null;
		this._cache[index] = val;

		if (needsReload) {
			if (this._reloadStartingIndex == -1 || this._reloadStartingIndex > index)
				this._reloadStartingIndex = index;
			this.reloadGrid();
		}
	}

	async waitForResizes() {
		return await new Promise((resolve, reject) => {
			setTimeout(() => {
				console.log('_isWaitingForReload:', this._isWaitingForReload);
				if (this._isWaitingForReload) {
					return this._reloadPromise.then(resolve);
				}

				return resolve(true);
			}, 100);
		});
	}
	reloadGrid() {
		if (typeof this._relaodfunction != 'function') {
			return;
		}
		if (this._isWaitingForReload) return;
		this._isWaitingForReload = true;
		this._reloadPromise = new Promise((resolve, reject) => {
			setTimeout(
				(sh: SizeHelper) => {
					//console.log('reload afterIndex:', sh._reloadStartingIndex);
					sh._relaodfunction(sh._reloadStartingIndex);
					sh._reloadStartingIndex = -1;
					this._isWaitingForReload = false;
					resolve(true);
				},
				200,
				this
			);
		});
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
