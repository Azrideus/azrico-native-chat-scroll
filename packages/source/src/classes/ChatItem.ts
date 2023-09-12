import { UIDHelper } from './UIDHelper';

export class ChatItem {
	readonly key: string;
	readonly itemid: string;
	readonly data: any;
	readonly _created_date: Date;
	readonly _created_time: number;
	public index: number = -1;

	constructor(d: any) {
		//set the data
		this.data = d;

		//get the id from data
		this.itemid = ChatItem.getObjectId(this.data);
		if (this.itemid != null) this.key = 'msg-' + this.itemid;
		else this.key = String(UIDHelper.nextid());

		//assign the date
		this._created_date = ChatItem.getObjectDate(this.data);
		this._created_time = this._created_date.getTime();
	}

	static getObjectId(inp) {
		return inp._id ?? inp.id;
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
