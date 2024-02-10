import { Ref } from 'react';
import { UIDHelper } from './HelperFunctions';
import ChatManager from './ChatManager';

export type ItemData = any;
export class ChatItem {
	readonly key: string;
	readonly data: ItemData;

	readonly _id: string;
	readonly _creator: string;
	readonly _created_date: Date;
	readonly _created_time: number;
	readonly managerClass: ChatManager;

	private __options: any = {};

	public previtem?: ChatItem;
	public nextitem?: ChatItem;

	public isNew: boolean = false;
	public itemref?: React.MutableRefObject<any>;
	public refreshFunction?: Function;

	constructor(mng: ChatManager, d: ItemData) {
		//set the data
		this.managerClass = mng;
		this.data = d ?? {};

		//get the id from data
		this._id = ChatItem.getObjectId(this.data) || UIDHelper.nextid();
		this.key = String(this._id);

		//assign the date
		this._created_date = ChatItem.getObjectDate(this.data);
		this._created_time = this._created_date.getTime();

		//assign creator
		this._creator = this.data._creator;
	}

	async updateId(newid: string) {
		return await this.managerClass.updateMessageId(this, newid);
	}
	runRefreshFunction() {
		console.log('runRefreshFunction');
		return typeof this.refreshFunction === 'function' && this.refreshFunction();
	}

	savePosition() {
		this.__options['lasttop'] = this.topDistance;
	}
	async Delete() {
		return await this.managerClass.deleteMessage(this);
	}

	get topDistance() {
		return this.itemref?.current?.getBoundingClientRect().top || 0;
	}
	get lastTop() {
		return this.__options['lasttop'] || Number.NaN;
	}
	static getObjectId(inp: any) {
		return inp._id ?? inp.id;
	}
	static getObjectDate(inp: any): Date {
		let controlObject = inp;
		if (controlObject)
			try {
				return new Date(controlObject._created_date ?? controlObject.date);
			} catch {}
		return new Date();
	}
}
