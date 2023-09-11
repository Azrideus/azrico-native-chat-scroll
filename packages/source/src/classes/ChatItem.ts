import { UIDHelper } from './UIDHelper';

export class ChatItem {
	readonly key: string;
	readonly index: number;
	readonly data: any;
	readonly _created_date: Date;
	readonly _created_time: number;

	constructor(ind: number, data: any);
	constructor(ind: number, data: any, key: string);

	constructor(ind: number, d: any, k?: string) {
		this.index = ind;

		if (d && d instanceof ChatItem) {
			this.key = d.key;
			this.data = d.data;
			this._created_date = d._created_date;
		} else {
			this.key = String(k || UIDHelper.nextid());
			this.data = d;
			this._created_date = ChatItem.getObjectDate(this.data);
		}

		this._created_time = this._created_date.getTime();
	}
	static getObjectDate(inp) {
		let controlObject = inp;
		if (controlObject)
			try {
				return new Date(controlObject.date || controlObject._created_date);
			} catch {}

		return new Date();
	}
}
