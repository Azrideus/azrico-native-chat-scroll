import { ChatItem } from './ChatItem';
import { UIDHelper } from './UIDHelper';

//max number of items we keep in cache
const MAX_LOAD = 80;

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
	skip: number;
	limit: number;
	date?: Date;
};
export type LoadFunctionType = (props: SearchQuery) => Promise<any[]> | any[];
export type RefreshFunctionType = () => any;

type SetItemsFunctionType = (items: ChatItem[]) => any;

export class ChatManager {
	static WRAPPER_HEIGHT = 400;
	static WRAPPER_BUFFER_HEIGHT = ChatManager.WRAPPER_HEIGHT + 200;

	//we update scroll positions relative to this item to prevent the scroll from jumping
	private referenceItem: ChatItem | undefined;
	#lastJumpDistance: number = 0;

	private currentItems: ChatItem[] = [];
	private newItems: ChatItem[] = [];

	public isSticky: boolean = true;
	// public scrollPercent: number = 0;
	public distanceToTop: number = 0;
	public distanceToBottom: number = 0;

	#lastLoadDirection: LoadDirection = LoadDirection.NONE;
	#lastOperation: ChangeOperation = ChangeOperation.NONE;
	#lastCountChange: number = 0;

	private currentLoadOperation?: any;

	private setItemsFunction?: SetItemsFunctionType;

	private loadFunction?: LoadFunctionType;
	private refreshFunction?: RefreshFunctionType;

	private lastCount: number = 0;
	private lastDBLoad: number = 0;

	//date of newest message
	//this helps in pagination
	private dayZeroDate?: number;
	private idOfFirstMessage?: any;

	#isAtBottom?: boolean;
	#isAtTop?: boolean;

	constructor() {}

	set_loadFunction(fnc: LoadFunctionType) {
		this.loadFunction = fnc;
	}
	set_refreshFunction(fnc: RefreshFunctionType) {
		this.refreshFunction = fnc;
	}
	set_setItemsFunction(fnc: SetItemsFunctionType) {
		this.setItemsFunction = fnc;
	}

	/**
	 * add a new message to the bottom of the list
	 * @param msglist
	 */
	async sendNewMessage(...msglist: Array<ChatItem | any>) {
		if (msglist.length === 0) return;
		const messagesToAdd = msglist.map((r: any) =>
			r instanceof ChatItem ? r : new ChatItem(r)
		);

		console.log('New Message:', messagesToAdd);
		if (this.isAtBottom) {
			//we are at the bottom of the list, new messages should be added

			// fix indexes of the items
			messagesToAdd.forEach((r, i) => {
				r.index = i;
				r.isNew = true;
			});

			//shift all indexes up
			this.currentItems.forEach((r) => {
				r.index += messagesToAdd.length;
			});

			this.newItems.push();
			//add the items
			await this.add_items_to_list(messagesToAdd, LoadDirection.DOWN);
		}
	}

	async loadIfNeeded() {
		if (this.shouldLoadTop) await this.loadWhenAvailable(LoadDirection.UP);
		else if (this.shouldLoadDown) await this.loadWhenAvailable(LoadDirection.DOWN);
		else return;
		//keep loading if we are still at top/bottom of the list
		await this.loadIfNeeded();
	}

	/**
	 * load the next batch of items when all previous loads are finished
	 * @param direction
	 * @returns
	 */
	private async loadWhenAvailable(direction: LoadDirection = LoadDirection.UP) {
		//wait for the previous load to finish
		if (this.currentLoadOperation != null) await this.currentLoadOperation;
		this.currentLoadOperation = this.load_items(direction);
		return await this.currentLoadOperation;
	}
	/**
	 * load more items in the given direction
	 * @param direction
	 */
	private async load_items(direction: LoadDirection = LoadDirection.UP) {
		if (!this.loadFunction) return;

		const search_query: SearchQuery = {
			skip: 0,
			limit: BATCH_SIZE,
			date: this.dayZeroDate ? new Date(this.dayZeroDate) : undefined,
		};
		if (direction == LoadDirection.DOWN) {
			search_query.skip = Math.max(0, this.bottomMessageIndex - BATCH_SIZE);
			//make sure we dont load items that are already loaded
			search_query.limit = Math.min(
				BATCH_SIZE,
				this.bottomMessageIndex - search_query.skip
			);
		} else {
			search_query.skip = this.topMessageIndex + 1;
		}

		this.#lastLoadDirection = direction;

		//

		const loaded_items = await this.loadFunction(search_query);

		//
		this.lastDBLoad = loaded_items.length;

		/* ------------------------ convert items to ChatItem ----------------------- */
		let final_chats = loaded_items
			.map((r, i) => new ChatItem(r))
			/* -------- first sort in inverse so we can assign Indexes correctly -------- */
			.sort((a, b) => b._created_time - a._created_time);

		/* ------------------------------ apply indexes ----------------------------- */
		const startingIndex = search_query.skip;
		final_chats = final_chats.map((r, i) => {
			r.index = startingIndex + i;
			return r;
		});
		/* -------------------- then reverse and add to the list -------------------- */
		final_chats = final_chats.reverse();
		await this.add_items_to_list(final_chats, direction);
	}

	private async remove_items(count: number, direction: LoadDirection = LoadDirection.UP) {
		try {
			if (count === 0 || direction === LoadDirection.NONE) return;

			this.#lastOperation =
				direction === LoadDirection.UP
					? ChangeOperation.REMOVE_UP
					: ChangeOperation.REMOVE_DOWN;

			let resultItems = [...this.currentItems];
			count = Math.min(Math.abs(count), resultItems.length);
			//
			if (direction === LoadDirection.UP) {
				//remove from top
				resultItems.splice(0, count);
			} else if (direction === LoadDirection.DOWN) {
				const rmStartIndex = Math.max(resultItems.length - count, 0);
				resultItems.splice(rmStartIndex);
			}
			await this.setItems(resultItems);
		} finally {
			this.check_position();
		}
	}
	private async add_items_to_list(
		items: ChatItem[],
		direction: LoadDirection = LoadDirection.UP
	) {
		try {
			if (items.length === 0) return;
			this.#lastOperation =
				direction === LoadDirection.UP
					? ChangeOperation.ADD_UP
					: ChangeOperation.ADD_DOWN;

			const nextItems = [...this.currentItems];

			if (direction === LoadDirection.UP) {
				//add above the list
				nextItems.unshift(...items);
			} else {
				//add below the list
				nextItems.push(...items);
			}
			await this.setItems(nextItems);
			await this.cleanExtraItems();
		} finally {
			this.check_position();
		}
	}

	private async setItems(items: ChatItem[]) {
		this.before_update();
		this.currentItems = items;
		this.#lastCountChange = this.currentItems.length - this.lastCount;
		this.lastCount = this.currentItems.length;
		//console.log('dayZeroDate', this.#dayZeroDate);
		//console.log('loadedNewestDate', this.#loadedNewestDate);
		//console.log('diff', this.#loadedNewestDate - (this.#dayZeroDate || 0));
		//console.log('isAtBottom', this.#isAtBottom);
		//console.log('setitems', this.currentItems);
		if (this.setItemsFunction) await this.setItemsFunction(this.currentItems);

		this.after_update();
	}

	/**
	 * clear items that are no longer in view
	 */
	private async cleanExtraItems() {
		if (this.currentItems.length > MAX_LOAD) {
			const countToRemove = MAX_LOAD - this.currentItems.length + 10;
			let dirToRemove = LoadDirection.NONE;

			if (this.lastLoadDirection === LoadDirection.UP && !this.isCloseToBottom) {
				dirToRemove = LoadDirection.DOWN;
			} else if (this.lastLoadDirection === LoadDirection.DOWN && !this.isCloseToTop) {
				dirToRemove = LoadDirection.UP;
			}

			console.log('removing items from', dirToRemove);

			if (dirToRemove != LoadDirection.NONE)
				await new Promise((resolve) => {
					setTimeout(
						(selfRef) => {
							this.remove_items(countToRemove, dirToRemove).then(resolve);
						},
						0,
						this
					);
				});
		}
	}

	private before_update() {
		this.referenceItem?.savePosition();
	}
	private after_update() {
		this.referenceItem = this.middleMessage;

		if (
			this.bottomMessageDate &&
			(!this.dayZeroDate || this.bottomMessageDate > this.dayZeroDate)
		) {
			//first time loading items
			//find the newest date so we can use it as reference
			this.dayZeroDate = this.bottomMessageDate;
			//console.log('day zero date updated');
		}
	}

	/**
	 * check if we reached the bottom or top of the list
	 */
	private check_position() {
		const new_isAtBottom =
			!this.dayZeroDate ||
			!this.bottomMessageDate ||
			this.bottomMessageDate >= this.dayZeroDate;

		//if we load fewer items than the limit, it means we have reached the top of the chat
		if (this.lastLoadDirection === LoadDirection.UP && this.lastDBLoad < BATCH_SIZE) {
			this.idOfFirstMessage = this.topMessage?.itemid;
		}

		const new_isAtTop =
			this.topMessage != null && this.topMessage.itemid === this.idOfFirstMessage;

		if (new_isAtTop != this.#isAtTop || new_isAtBottom != this.#isAtBottom) {
			this.refreshFunction && this.refreshFunction();
		}

		this.#isAtBottom = new_isAtBottom;
		this.#isAtTop = new_isAtTop;
	}

	/* --------------------------------- getters -------------------------------- */
	get topMessageDate(): number | undefined {
		return this.topMessage?._created_time ?? undefined;
	}
	get bottomMessageDate(): number | undefined {
		return this.bottomMessage?._created_time ?? undefined;
	}
	get topMessageIndex(): number {
		return this.topMessage?.index ?? -1;
	}
	get bottomMessageIndex(): number {
		return this.bottomMessage?.index ?? -1;
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

	get referenceTop(): number {
		return this.referenceItem?.topDistance || 0;
	}
	get referenceLastTop(): number {
		return this.referenceItem?.lastTop || 0;
	}
	get isAtTop() {
		return this.#isAtTop;
	}
	get isAtBottom() {
		return this.#isAtBottom;
	}

	get isCloseToTop() {
		return this.distanceToTop < ChatManager.WRAPPER_BUFFER_HEIGHT;
	}
	get isCloseToBottom() {
		return this.distanceToBottom < ChatManager.WRAPPER_BUFFER_HEIGHT;
	}

	get shouldLoadTop() {
		return this.isCloseToTop && !this.isAtTop;
	}
	get shouldLoadDown() {
		return this.isCloseToBottom && !this.#isAtBottom;
	}

	/* number of changed items in the last load */
	get lastCountChange() {
		return this.#lastCountChange;
	}
	get lastLoadDirection(): LoadDirection {
		return this.#lastLoadDirection;
	}

	get lastOperation(): ChangeOperation {
		return this.#lastOperation;
	}
}
export default ChatManager;
