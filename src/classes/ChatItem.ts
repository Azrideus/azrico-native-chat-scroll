import { Ref } from 'react';
import { UIDHelper } from './HelperFunctions';
import ChatManager from './ChatManager';

export type ItemData = any;
export class ChatItem<T> {
	readonly key: string;
	readonly data: ItemData;

	readonly _id: string;
	readonly _creator: string;
	readonly _created_date: Date;
	readonly _created_time: number;
	readonly managerClass: ChatManager<T>;

	private __options: any = {};

	public previtem?: ChatItem<T>;
	public nextitem?: ChatItem<T>;

	public isNew: boolean = false;
	public itemref?: React.MutableRefObject<any>;
	public refreshFunction?: Function;

	constructor(mng: ChatManager<T>, d: ItemData) {
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
		return typeof this.refreshFunction === 'function' && this.refreshFunction();
	}

	savePosition() {
		this.__options['lasttop'] = this.topDistance;
	}
	async Delete() {
		return await this.managerClass.deleteMessage(this);
	}
	/* -------------------------------------------------------------------------- */
	get element() {
		const itemref = this.itemref?.current;
		if (!itemref) return undefined;
		return itemref;
	}
	get boundingClientRect() {
		return this.element?.getBoundingClientRect();
	}
	get topDistance() {
		return this.boundingClientRect?.top ?? Number.NaN;
	}
	get bottomDistance() {
		return this.boundingClientRect?.bottom ?? Number.NaN;
	}

	get elementHeight() {
		return this.boundingClientRect?.height ?? Number.NaN;
	}

	get lastTop() {
		return this.__options['lasttop'] ?? Number.NaN;
	}
	/* -------------------------------------------------------------------------- */
	static getObjectId(inp: any) {
		return inp._id ?? inp.id;
	}
	static getObjectDate(inp: any): Date {
		let controlObject = inp;
		if (controlObject)
			try {
				return new Date(
					controlObject['_created_date'] ?? controlObject['date'] ?? controlObject['Date']
				);
			} catch {}
		return new Date();
	}
}
