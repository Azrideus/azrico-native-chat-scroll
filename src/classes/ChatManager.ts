import { ChatItem, ItemData } from './ChatItem';

//max number of items we keep in cache
const MAX_LOAD = 65;

//items we load in each batch
const BATCH_SIZE = 30;

export enum LoadDirection {
	DOWN = -1,
	NONE = 0,
	UP = 1,
}
export enum ChangeOperation {
	REMOVE_UP = 'REMOVE_UP',
	REMOVE_DOWN = 'REMOVE_DOWN',
	NONE = 'NONE',
	ADD_DOWN = 'ADD_DOWN',
	ADD_UP = 'ADD_UP',
}

export type SearchQuery = {
	skip?: number;
	limit: number;
	_created_date?: { $lte?: Date; $gte?: Date };
	sort?: any;
	exclude?: any[];
};
export type LoadFunctionType = (props: SearchQuery) => Promise<ItemData[]> | ItemData[];
export type RefreshFunctionType = () => any;

type SetItemsFunctionType = (items: ChatItem[]) => any;
type MessageSearchParams = ChatItem | ItemData | string | number;

export class ChatManager {
	static WRAPPER_HEIGHT = 400;
	static WRAPPER_BUFFER_HEIGHT = ChatManager.WRAPPER_HEIGHT + 200;
	public show_logs = false;

 

	#currentItems: ChatItem[] = [];
	private itemsIndexMap: { [key: string]: number } = {};

	private isLastLoadFromDB: boolean = true;

	

	#lastLoadDirection: LoadDirection = LoadDirection.NONE;
	#lastOperation: ChangeOperation = ChangeOperation.NONE;
	#lastCountChange: number = 0;
	#lastDBLoad: number = 0;
 

	private setItemsFunction?: SetItemsFunctionType;

	private loadFunction?: LoadFunctionType;
	private refreshFunction?: RefreshFunctionType;

	private lastCount: number = 0;

	private id_veryTopMessage?: any;
	private id_veryBottomMessage?: any;

	constructor() {}

	set_loadFunction(fnc: LoadFunctionType | undefined) {
		this.loadFunction = fnc;
	}
	set_refreshFunction(fnc: RefreshFunctionType) {
		this.refreshFunction = fnc;
	}
	set_setItemsFunction(fnc: SetItemsFunctionType) {
		this.setItemsFunction = fnc;
	}

	/**
	 * get message `index` using its `_id` or `data` and the `itemsIndexMap` table.
	 * returns -1 if not found
	 * @param search
	 */
	getMessageIndex(search: MessageSearchParams): number {
		if (!search) return -1;

		/* ------------------ search for indexed items by their id ------------------ */
		let msgid = '';
		////if (typeof search === 'object')
		////	msgid = search instanceof ChatItem ? search._id : search._id;
		if (typeof search === 'object') msgid = search._id;
		else msgid = String(search);
		if (this.itemsIndexMap[msgid]) return this.itemsIndexMap[msgid];

		/* ----------------------- search by data of the item ----------------------- */
		if (typeof search === 'object') {
			const found_ChatItem = this.currentItems.find((s) => s.data === search);
			msgid = found_ChatItem?._id ?? '';
			if (this.itemsIndexMap[msgid]) return this.itemsIndexMap[msgid];
		}

		return -1;
	}
	/**
	 * get a message by using the `getMessageIndex` function
	 * @param search
	 */
	getMessage(search: MessageSearchParams): ChatItem | undefined {
		if (!search) return undefined;
		if (
			typeof search === 'object' &&
			search instanceof ChatItem &&
			this.currentItems.includes(search)
		)
			return search;
		/* ------------ find the index and return the item at that index ------------ */
		const itemIndex = this.getMessageIndex(search);
		if (itemIndex < 0) return undefined;
		return this.currentItems[itemIndex];
	}
	/**
	 * delete the given message from the list
	 * @param msg
	 */
	async deleteMessage(msg: MessageSearchParams): Promise<boolean> {
		const rmIndex = this.getMessageIndex(msg);
		if (rmIndex < 0) return false;
		const newArr = [...this.currentItems];
		newArr.splice(rmIndex, 1);
		await this._setItems(newArr);
		return true;
	}

	/**
	 * call `runRefreshFunction` on the message
	 * @param search
	 * @returns
	 */
	async refreshMessage(search: MessageSearchParams): Promise<boolean> {
		const msg = this.getMessage(search);
		if (!msg) return false;
		await msg?.runRefreshFunction();
		return true;
	}
	/**
	/**
	 * change id of a message. if `newid` already exists, will delete the message with that id
	 * will run the `chatManager.buildIndexMap` and `chatItem.runRefreshFunction` functions
	 * @param message
	 * @param newid
	 * @returns true if success, false otherwise
	 */
	async updateMessageId(message: MessageSearchParams, newid: string) {
		const updateMessage = this.getMessage(message);
		if (!updateMessage) return false;

		const existingMessage = this.getMessage(newid);
		if (existingMessage) {
			this.log('updateMessageId', `removing existing message with id ${newid}`);
			await this.deleteMessage(existingMessage);
		}
		/* ------------------------------ update the id ----------------------------- */
		(updateMessage as any)._id = newid;
		this.buildIndexMap();
		await this.refreshMessage(updateMessage);
		this.log('updateMessageId', `${updateMessage._id}`, `-> ${newid}`);
		return true;
	}

	/**
	 * add a new message to the bottom of the list
	 * @param msglist
	 * @returns number of added messages
	 */
	async sendNewMessage(...msglist: Array<ChatItem | any>): Promise<number> {
		// convert inputs to ChatItem
		const messagesToAdd = msglist
			.flat()
			.filter((s) => s)
			.map((r: any) => (r instanceof ChatItem ? r : new ChatItem(this, r)));

		//make sure the messages are not already loaded :
		const newMessagesToAdd = messagesToAdd.filter((s) => !this.itemsIndexMap[s._id]);

		this.log(
			'sendNewMessage',
			`• msglist: ${msglist.length}`,
			`• messagesToAdd: ${messagesToAdd.length}`,
			`• newMessagesToAdd: ${newMessagesToAdd.length}`
		);

		if (newMessagesToAdd.length === 0) return 0;
		if (this.veryBottomMessageVisible) {
			const addCount = await this._addItems(newMessagesToAdd, LoadDirection.DOWN, false);
			//if a new message is added the bottom message must change
			this.updateBottomMessage();
			return addCount;
		}
		return 0;
	}

 
 

	/* -------------------------------------------------------------------------- */
	/*                              private functions                             */
	/* -------------------------------------------------------------------------- */

	/**
	 * load more items in the given direction
	 * @param direction
	 */
	public async fetch_items(direction: LoadDirection = LoadDirection.UP) { 
		if (!this.loadFunction) return;

		const search_query: SearchQuery = {
			limit: BATCH_SIZE,
		};

		if (direction == LoadDirection.DOWN) {
			search_query.sort = { _created_date: 1 };
			if (this.bottomMessage?._created_date)
				search_query._created_date = { $gte: this.bottomMessage?._created_date };
		} else {
			search_query.sort = { _created_date: -1 };
			if (this.topMessage?._created_date)
				search_query._created_date = { $lte: this.topMessage?._created_date };
		}
		search_query.exclude = this.currentItems.map((r) => r._id); 
		this.#lastLoadDirection = direction; 

		const loaded_items = await this.loadFunction(search_query);
		this.log(
			'load_items',
			`• search_query: `,
			search_query,
			`• loaded_items: ${loaded_items.length}`,
			`• direction: ${direction}`
		);
		//
		this.#lastDBLoad = loaded_items.length;

		/* ------------------------ convert items to ChatItem ----------------------- */
		let final_chats = loaded_items
			.map((r, i) => new ChatItem(this, r))
			/* ----------------------------- sort the items ----------------------------- */
			.sort(ChatManager.item_sort);
		await this._addItems(final_chats, direction, true);
	}

	/**
	 * add the given items to given direction of current items
	 * @param items_to_add
	 * @param direction
	 * @param isFromDB
	 * @returns
	 */
	private async _addItems(
		items_to_add: ChatItem[],
		direction: LoadDirection = LoadDirection.UP,
		isFromDB: boolean = true
	): Promise<number> {
		this.#lastOperation =
			direction === LoadDirection.UP ? ChangeOperation.ADD_UP : ChangeOperation.ADD_DOWN;
		this.isLastLoadFromDB = isFromDB;

		const resultItems = [...this.currentItems];
		if (direction === LoadDirection.UP) {
			//add above the list
			resultItems.unshift(...items_to_add);
		} else {
			//add below the list
			resultItems.push(...items_to_add);
		}
		await this._setItems(resultItems);
		return items_to_add.length;
	}

	/**
	 * set all current items
	 * @param items
	 * @returns
	 */
	private async _setItems(items: ChatItem[]): Promise<number> {
 
		this.currentItems = items;
		this.#lastCountChange = items.length - this.lastCount;
		this.lastCount = this.currentItems.length;
		this.after_update(); 
		this.log(
			'setItems',
			`• search_query: `,
			`• currentItems: ${this.currentItems.length}`,
			`• lastCountChange: ${this.#lastCountChange}`
		);
		if (this.setItemsFunction) await this.setItemsFunction(this.currentItems);
		return this.currentItems.length;
	}
 

	 
	private after_update() {
		this.buildIndexMap();
		this.check_position();
		this.update_next_prev_items();
	}
	/**
	 * set the `itemsIndexMap`
	 */
	private buildIndexMap() {
		//set the item map
		this.itemsIndexMap = {};
		for (let index = 0; index < this.currentItems.length; index++) {
			const element = this.currentItems[index];
			this.itemsIndexMap[element._id] = index;
		}
	}
	/**
	 * update `nextitem` and `previtem` for every message
	 */
	private update_next_prev_items() {
		const maxindex = this.currentItems.length - 1;
		for (let i = 0; i < this.currentItems.length; i++) {
			const r = this.currentItems[i];
			r.nextitem = i != maxindex ? this.currentItems[i + 1] : undefined;
			r.previtem = i != 0 ? this.currentItems[i - 1] : undefined;
		}
	}

	/**
	 * check if we reached the bottom or top of the list
	 */
	private check_position() {
		if (!this.isLastLoadFromDB) {
			this.updateBottomMessage();
			return;
		}
		/* -------------------------------------------------------------------------- */
		/*                          Loading Something from DB                         */
		/* -------------------------------------------------------------------------- */
		if (!this.id_veryBottomMessage) {
			//if bottom message is not set yet (first load), set it to the current bottom item
			//if the bottom message id is -1 this will not run !
			this.updateBottomMessage();
		}

		/* ---------------- loading less than limit means end of chat --------------- */
		//we load less items than limit -> we have reached the top/bottom of the chat
		if (this.#lastDBLoad < BATCH_SIZE) {
			//console.log('loaded less items than expected. updating max/min');
			if (this.lastLoadDirection === LoadDirection.DOWN) this.updateBottomMessage();
			else if (this.lastLoadDirection === LoadDirection.UP)
				this.id_veryTopMessage = this.topMessage?._id;
		} else {
			// clear top/bot if we are in middle of the list
			// so we can correctly detect new messages that are added below the veryBottomMessage
			if (this.id_veryBottomMessage != this.bottomMessage?._id) {
				this.id_veryBottomMessage = -1;
			}
			if (this.id_veryTopMessage != this.topMessage?._id) {
				this.id_veryTopMessage = -1;
			}
		}
	}
	private updateBottomMessage() {
		this.id_veryBottomMessage = this.bottomMessage?._id;
	}

	/* ----------------------------------- log ---------------------------------- */
	private log(...msg: any[]) {
		if (this.show_logs) console.log('[react-chatscroll]', ...msg);
	}

	/* --------------------------------- getters -------------------------------- */
	get currentItems() {
		return this.#currentItems;
	}
	set currentItems(v) {
		this.#currentItems = v;
		this.buildIndexMap();
	}

	get topMessageDate(): number | undefined {
		return this.topMessage?._created_time ?? undefined;
	}
	get bottomMessageDate(): number | undefined {
		return this.bottomMessage?._created_time ?? undefined;
	}

	get topMessage(): ChatItem | undefined {
		if (this.currentItems.length === 0) return undefined;
		return this.currentItems[0];
	}
	get middleMessage(): ChatItem | undefined {
		if (this.currentItems.length === 0) return undefined;
		return this.currentItems[Math.ceil(this.currentItems.length / 2)];
	}
	get bottomMessage(): ChatItem | undefined {
		if (this.currentItems.length === 0) return undefined;
		return this.currentItems[this.currentItems.length - 1];
	}

	 

	/* we are at the very top. we cant go up anymore */
	get isAtVeryTop() {
		if (
			this.bottomMessage == null &&
			this.topMessage == null &&
			this.lastOperation != ChangeOperation.NONE
		)
			return true;
		return this.topMessage != null && this.topMessage._id === this.id_veryTopMessage;
	}

	/* the message at the very bottom of the list is visible Or not defined */
	get veryBottomMessageVisible() {
		return (
			this.bottomMessage == null || this.bottomMessage._id === this.id_veryBottomMessage
		);
	}

 
 

	/* number of changed items in the last load */
	get itemCount() {
		return this.currentItems.length;
	}
	get lastCountChange() {
		return this.#lastCountChange;
	}
	get lastDBLoad() {
		return this.#lastDBLoad;
	}
	get lastLoadDirection(): LoadDirection {
		return this.#lastLoadDirection;
	}

	get lastOperation(): ChangeOperation {
		return this.#lastOperation;
	}

	/* -------------------------------------------------------------------------- */
	/*                              static functions                              */
	/* -------------------------------------------------------------------------- */
	/**
	 * returns which item should come first, A or B
	 * if A > B returns positive
	 * if B > A returns negative
	 * @param a
	 * @param b
	 * @returns
	 */
	public static item_sort(a: ChatItem, b: ChatItem, sortdir = 1) {
		let dtCmp = a._created_time - b._created_time;
		if (dtCmp === 0 && a._id && b._id) dtCmp = a._id.localeCompare(b._id);
		if (dtCmp === 0 && a.data.text && b.data.text)
			dtCmp = a.data.text.localeCompare(b.data.text);
		return dtCmp * sortdir;
	}
}
export default ChatManager;
