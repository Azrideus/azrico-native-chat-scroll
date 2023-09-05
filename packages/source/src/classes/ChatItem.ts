import { UIDHelper } from './UIDHelper';

export class ChatItem {
	readonly key: string;
	readonly data: any;
	readonly _created_date: Date;
	readonly _created_time: number;

	constructor(data: any);
	constructor(data: any, key: string);

	constructor(d: any, k?: string) {
		this.key = String(k || UIDHelper.nextid());
		this.data = d;
		/* -------------------------------------------------------------------------- */
		if (this.data) {
			this._created_date = this.data.date || this.data._created_date;
		} else {
			this._created_date = new Date();
		}
		this._created_time = this._created_date.getTime();
	}
}
