import { ChatItem, ItemData } from './ChatItem';



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
	//items we load in each batch
	static BATCH_SIZE = 10;
	static CLEAN_EXTRA_SIZE = 10;
	static MAX_LOAD = ChatManager.BATCH_SIZE + ChatManager.CLEAN_EXTRA_SIZE + 30;

	public show_logs = false;
	public distanceToTop: number = 0;
	public distanceToBottom: number = 0;
	public loadBufferDistance: number = 800;
	/* -------------------------------------------------------------------------- */

	//we update scroll positions relative to this item to prevent the scroll from jumping

	private references: Partial<{ item: ChatItem; top: number; bottom: number }> = {};

	/* -------------------------------------------------------------------------- */
	#lastLoadDirection: LoadDirection = LoadDirection.NONE;
	#lastOperation: ChangeOperation = ChangeOperation.NONE;
	#lastCountChange: number = 0;
	#lastDBLoad: number = 0;
	#currentItems: ChatItem[] = [];
	private isLastLoadFromDB: boolean = true;

	private itemsIndexMap: { [key: string]: number } = {};

	private setItemsFunction?: SetItemsFunctionType;

	private loadFunction?: LoadFunctionType;
	private refreshFunction?: RefreshFunctionType;

	private lastCount: number = 0;

	private id_veryTopMessage?: any;
	private id_veryBottomMessage?: any;

	private currentLoadOperation?: any;

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
	async sendNewMessage(
		msglist: Array<ChatItem | any>,
		dir = LoadDirection.DOWN
	): Promise<number> {
		if (!msglist) return 0;
		if (!Array.isArray(msglist)) msglist = [msglist];
		// convert inputs to ChatItem
		const messagesToAdd = msglist
			.flat()
			.filter((s) => s)
			.map((r: any) => (r instanceof ChatItem ? r : new ChatItem(this, r)));

		//make sure the messages are not already loaded :
		const newMessagesToAdd = messagesToAdd.filter((s) => !this.itemsIndexMap[s._id]);

		this.group_log(
			'sendNewMessage',
			['msglist', msglist.length],
			['messagesToAdd', messagesToAdd.length],
			['newMessagesToAdd', newMessagesToAdd.length],
			['veryBottomMessageVisible', this.veryBottomMessageVisible]
		);

		if (newMessagesToAdd.length === 0) return 0;
		if (this.veryBottomMessageVisible) {
			const addCount = await this._addItems(newMessagesToAdd, dir, false);
			//if a new message is added the bottom message must change
			this.updateBottomMessage();
			return addCount;
		}
		return 0;
	}

	public async maybeLoad(checkDir = LoadDirection.NONE) {
		let loadDir = LoadDirection.NONE;
		if (checkDir != LoadDirection.NONE) {
			/* --------------------- use checkDir to verify loadDir --------------------- */
			if (checkDir === LoadDirection.DOWN && !this.veryBottomMessageVisible)
				loadDir = checkDir;
			else if (checkDir === LoadDirection.UP && !this.isAtVeryTop) loadDir = checkDir;
		} else {
			/* ------------------------- auto determine loaddir ------------------------- */
			if (this.shouldLoadDown) loadDir = LoadDirection.DOWN;
			else if (this.shouldLoadTop) loadDir = LoadDirection.UP;
		}

		if (loadDir == LoadDirection.NONE) return false;
		return await this.fetch_items(loadDir);
	}
	/**
	 * load more items in the given direction
	 * @param direction
	 */
	public async fetch_items(direction: LoadDirection = LoadDirection.UP) {
		if (this.currentLoadOperation != null) await this.currentLoadOperation;
		this.currentLoadOperation = this.fetch_items_inner(direction);
		const opres = await this.currentLoadOperation;
		this.currentLoadOperation = null;
		return opres;
	}

	private async fetch_items_inner(direction: LoadDirection = LoadDirection.UP) {
		if (!this.loadFunction) return;
		const search_query: SearchQuery = {
			limit: ChatManager.BATCH_SIZE,
		};
		//TODO: fix sort for loading
		if (direction == LoadDirection.DOWN) {
			search_query.sort = { _created_date: 1 };
			if (this.bottomMessage?._created_date)
				search_query._created_date = { $gte: this.bottomMessage?._created_date };
		} else {
			search_query.sort = { _created_date: -1 };
			if (this.topMessage?._created_date)
				search_query._created_date = { $lte: this.topMessage?._created_date };
		}

		search_query.exclude = Object.keys(this.itemsIndexMap);

		const loaded_items = await this.loadFunction(search_query);
		this.#lastDBLoad = loaded_items.length;

		/* ------------------------ convert items to ChatItem ----------------------- */
		let final_chats = loaded_items
			.map((r, i) => new ChatItem(this, r))
			.sort(ChatManager.item_sort);

		this.group_log(
			'load_items',
			[`direction:`, direction],
			[`search_query:`, search_query],
			[`final_chats:`, final_chats.length]
		);
		await this._addItems(final_chats, direction, true);
	}

	/* -------------------------------------------------------------------------- */
	/*                              private functions                             */
	/* -------------------------------------------------------------------------- */

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
		this.#lastLoadDirection = direction;
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
		this.currentItems = this.cleanExtraItems(items);
		this.#lastCountChange = items.length - this.lastCount;
		this.lastCount = this.currentItems.length;
		this.after_update();

		this.group_log(
			'setItems',
			['lastCountChange', this.lastCountChange],
			['items', this.currentItems],
			['itemsIndexMap', Object.keys(this.itemsIndexMap).length, this.itemsIndexMap]
		);

		if (this.setItemsFunction) await this.setItemsFunction(this.currentItems);
		return this.currentItems.length;
	}

	/**
	 * clear items in the given list to match the max item count
	 */
	private cleanExtraItems(inputItems: ChatItem[]): ChatItem[] {
		if (inputItems.length <= ChatManager.MAX_LOAD) return inputItems;
		let countToRemove = Math.abs(
			ChatManager.MAX_LOAD - inputItems.length + ChatManager.CLEAN_EXTRA_SIZE
		);

		let dirToRemove = LoadDirection.NONE;

		if (this.lastLoadDirection === LoadDirection.UP && !this.isCloseToBottom) {
			dirToRemove = LoadDirection.DOWN;
		} else if (this.lastLoadDirection === LoadDirection.DOWN && !this.isCloseToTop) {
			dirToRemove = LoadDirection.UP;
		}

		countToRemove = Math.min(countToRemove, inputItems.length);
		if (countToRemove === 0 || dirToRemove === LoadDirection.NONE) return inputItems;

		let resultItems = [...inputItems];
		//
		if (dirToRemove === LoadDirection.UP) {
			//remove from top
			resultItems.splice(0, countToRemove);
		} else if (dirToRemove === LoadDirection.DOWN) {
			const rmStartIndex = Math.max(resultItems.length - countToRemove, 0);
			resultItems.splice(rmStartIndex);
		}
		return resultItems;
	}

	/**
	 * set reference to an item that is in view.
	 * we do this to make sure our reference item doesnt get unloaded
	 */
	public update_reference(baseData?: ChatItem[]) {
		if (!Array.isArray(baseData) || baseData.length === 0) baseData = this.currentItems;

		this.references = { bottom: this.distanceToBottom, top: this.distanceToTop };

		if (baseData.length > 0) {
			if (this.lastLoadDirection === LoadDirection.UP) {
				this.references.item = baseData[0];
			} else if (this.lastLoadDirection === LoadDirection.DOWN) {
				this.references.item = baseData[baseData.length - 1];
			}
		}
		this.references.item?.savePosition();
	}

	private after_update() {
		this.update_next_prev_items();
		this.check_position();
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
		//this.group_log(
		//	'buildIndexMap',
		//	['currentItems', this.currentItems.length],
		//	['itemsIndexMap', Object.keys(this.itemsIndexMap).length, this.itemsIndexMap]
		//);
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
		if (this.#lastDBLoad < ChatManager.BATCH_SIZE) {
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
	private group_log(name: string, ...msg: any[]) {
		if (this.show_logs) {
			console.group(`[react-chatscroll] | ${name}`);
			for (let index = 0; index < msg.length; index++) {
				const elem = msg[index];
				if (Array.isArray(elem)) console.log(...elem);
				else console.log(elem);
			}
			console.groupEnd();
		}
	}
	private log(...msg: any[]) {
		if (this.show_logs) console.log('[react-chatscroll]', ...msg);
	}
	private log_error(...msg: any[]) {
		console.error('[react-chatscroll]', ...msg);
	}

	/* --------------------------------- getters -------------------------------- */

	get isPending() {
		return this.currentLoadOperation != null;
	}
	get isSticky() {
		return this.distanceToBottom < 200;
	}
	get isCloseToTop() {
		return this.distanceToTop < this.loadBufferDistance;
	}
	get isCloseToBottom() {
		return this.distanceToBottom < this.loadBufferDistance;
	}

	get shouldLoadTop() {
		return this.isCloseToTop && !this.isAtVeryTop;
	}
	get shouldLoadDown() {
		return this.isCloseToBottom && !this.veryBottomMessageVisible;
	}
	/* ----------------------------------- ref ---------------------------------- */
	get jumpTop(): number {
		return this.distanceToTop - this.referenceLastDistanceTop;
	}
	get jumpBottom(): number {
		return this.distanceToBottom - this.referenceLastDistanceBottom;
	}
	get jumpItem(): number {
		return this.referenceItemCurrentTop - this.referenceItemLastTop;
	}

	get referenceLastDistanceTop(): number {
		return this.references.top ?? Number.NaN;
	}
	get referenceLastDistanceBottom(): number {
		return this.references.bottom ?? Number.NaN;
	}
	get referenceItemCurrentTop(): number {
		return this.references.item?.topDistance ?? Number.NaN;
	}
	get referenceItemLastTop(): number {
		return this.references.item?.lastTop ?? Number.NaN;
	}
	/* -------------------------------------------------------------------------- */
	get lastLoadDirection(): LoadDirection {
		return this.#lastLoadDirection;
	}
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

	/* -------------------------------------------------------------------------- */
	get topMessage(): ChatItem | undefined {
		if (this.currentItems.length === 0) return undefined;
		return this.currentItems[0];
	}
	get middleMessage(): ChatItem | undefined {
		if (this.currentItems.length === 0) return undefined;
		if (this.currentItems.length === 1) return this.currentItems[0];
		return this.currentItems[Math.ceil(this.currentItems.length / 2)];
	}
	get bottomMessage(): ChatItem | undefined {
		if (this.currentItems.length === 0) return undefined;
		return this.currentItems[this.currentItems.length - 1];
	}
	/* -------------------------------------------------------------------------- */

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
