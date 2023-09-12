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
	REMOVE = -1,
	NONE = 0,
	ADD = 1,
}

export type SearchQuery = {
	skip: number;
	limit: number;
	date?: Date;
};
export type LoadFunctionType = (props: SearchQuery) => Promise<any[]> | any[];

type SetItemsFunctionType = (items: ChatItem[]) => any;

export class ChatManager {
	currentItems: ChatItem[];
	currentPage = 0;

	#lastLoadDirection: LoadDirection = LoadDirection.NONE;
	#lastChangeDirection: LoadDirection = LoadDirection.NONE;
	#lastOperation: ChangeOperation = ChangeOperation.NONE;
	#lastCountChange: number = 0;

	private setItemsFunction?: SetItemsFunctionType;

	private loadFunction?: LoadFunctionType;
	private lastCount: number = 0;
	private lastDBLoad: number = 0;

	//date of newest message
	//this helps in pagination
	private dayZeroDate?: number;
	private loadedOldestDate?: number;
	private loadedNewestDate?: number;
	private idOfFirstMessage?: any;

	#isAtBottom?: boolean;
	#isAtTop?: boolean;

	constructor() {
		this.currentItems = [];
		this.currentPage = 0;
	}

	set_loadFunction(fnc: LoadFunctionType) {
		this.loadFunction = fnc;
	}
	set_setItemsFunction(fnc: SetItemsFunctionType) {
		this.setItemsFunction = fnc;
	}

	/**
	 * load more items in the given direction
	 * @param direction
	 */
	async load_items(direction: LoadDirection = LoadDirection.UP) {
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
		const loaded_items = await this.loadFunction(search_query);
		this.lastDBLoad = loaded_items.length;

		const startingIndex = this.topMessageIndex;
		const final_chats = loaded_items
			.map((r, i) => new ChatItem(r))
			//first sort in inverse so we can assign Indexes correctly
			.sort((a, b) => b._created_time - a._created_time)
			.map((r, i) => {
				r.index = startingIndex + i + 1;
				return r;
			})
			//then reverse and add
			.reverse();

		this.add_items_to_list(final_chats, direction);
	}

	private remove_items(count: number, direction: LoadDirection = LoadDirection.UP) {
		try {
			if (count === 0 || direction === LoadDirection.NONE) return;
			this.#lastChangeDirection = direction;
			this.#lastOperation = ChangeOperation.REMOVE;

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
			this.setItems(resultItems);
		} finally {
			this.check_if_bottom();
			this.check_if_top();
		}
	}
	private add_items_to_list(
		items: ChatItem[],
		direction: LoadDirection = LoadDirection.UP
	) {
		try {
			if (items.length === 0) return;
			this.#lastChangeDirection = direction;
			this.#lastOperation = ChangeOperation.ADD;

			const nextItems = [...this.currentItems];

			if (direction === LoadDirection.UP) {
				//add above the list
				nextItems.unshift(...items);
			} else {
				//add below the list
				nextItems.push(...items);
			}

			this.setItems(nextItems);
			if (this.currentItems.length > MAX_LOAD) {
				const countToRemove = MAX_LOAD - this.currentItems.length;
				const dirToRemove = direction * -1;
				setTimeout(
					(selfRef) => {
						selfRef.remove_items(countToRemove, dirToRemove);
					},
					500,
					this
				);
			}
		} finally {
			this.check_if_bottom();
			this.check_if_top();
		}
	}
	private setItems(items: ChatItem[]) {
		this.currentItems = items;
		this.#lastCountChange = this.currentItems.length - this.lastCount;
		this.lastCount = this.currentItems.length;

		this.update_values();

		//console.log('dayZeroDate', this.#dayZeroDate);
		//console.log('loadedNewestDate', this.#loadedNewestDate);
		//console.log('diff', this.#loadedNewestDate - (this.#dayZeroDate || 0));
		//console.log('isAtBottom', this.#isAtBottom);
		console.log('set items:', this.currentItems);
		if (this.setItemsFunction) this.setItemsFunction(this.currentItems);
	}

	private update_values() {
		const timeMap = this.currentItems.map((r) => r._created_time);
		const indexMap = this.currentItems.map((r) => r.index);

		/* --------------------- information about current data --------------------- */
		this.loadedOldestDate = Math.min(...timeMap);
		this.loadedNewestDate = Math.max(...timeMap);
		/* -------------------------------------------------------------------------- */

		if (!this.dayZeroDate && this.loadedNewestDate > 0) {
			//first time loading items
			//find the newest date so we can use it as reference
			this.dayZeroDate = this.loadedNewestDate;
		}
	}

	/**
	 * check if we reached the bottom of the list
	 */
	private check_if_bottom() {
		this.#isAtBottom =
			!this.dayZeroDate ||
			!this.loadedNewestDate ||
			this.loadedNewestDate >= this.dayZeroDate;
	}
	/**
	 * check if we have reached top of the list
	 */
	private check_if_top() {
		//if we load fewer items than the limit, it means we have reached the top of the chat
		if (this.lastLoadDirection === LoadDirection.UP && this.lastDBLoad < BATCH_SIZE) {
			this.idOfFirstMessage = this.topMessage?.itemid;
		}
		this.#isAtTop = this.topMessage && this.topMessage.itemid === this.idOfFirstMessage;
	}
	/* --------------------------------- getters -------------------------------- */
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
	get bottomMessage(): ChatItem | undefined {
		if (this.currentItems.length === 0) return undefined;
		return this.currentItems[this.currentItems.length - 1];
	}
	get isAtTop() {
		return this.#isAtTop;
	}
	get isAtBottom() {
		return this.#isAtBottom;
	}

	/* number of changed items in the last load */
	get lastCountChange() {
		return this.#lastCountChange;
	}
	get lastLoadDirection(): LoadDirection {
		return this.#lastLoadDirection;
	}
	get lastChangeDirection(): LoadDirection {
		return this.#lastChangeDirection;
	}
	get lastOperation(): ChangeOperation {
		return this.#lastOperation;
	}
}
export default ChatManager;
