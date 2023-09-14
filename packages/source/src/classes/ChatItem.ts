import { UIDHelper } from './UIDHelper';

export class ChatItem {
	readonly key: string;
	readonly itemid: string;
	readonly data: any;
	readonly _created_date: Date;
	readonly _created_time: number;
	private __options: any = {};

	public isNew: boolean = false;
	public itemRef?: HTMLElement;

	constructor(d: any) {
		//set the data
		this.data = d;

		//get the id from data
		this.itemid = ChatItem.getObjectId(this.data) || UIDHelper.nextid();
		this.key = String(this.itemid);

		//assign the date
		this._created_date = ChatItem.getObjectDate(this.data);
		this._created_time = this._created_date.getTime();
	}

	savePosition() {
		this.__options['lasttop'] = this.topDistance;
	}

	get topDistance() {
		return this.itemRef?.getBoundingClientRect().top || 0;
	}
	get lastTop() {
		return this.__options['lasttop'] || Number.NaN;
	}
	static getObjectId(inp: any) {
		return inp._id ?? inp.id;
	}
	static getObjectDate(inp: any) {
		let controlObject = inp;
		if (controlObject)
			try {
				return new Date(controlObject.date || controlObject._created_date);
			} catch {}

		return new Date();
	}
}
