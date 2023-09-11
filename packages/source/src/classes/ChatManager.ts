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

	#lastLoadDirection: LoadDirection;
	#lastCountChange: number = 0;

	private setItemsFunction?: SetItemsFunctionType;

	private loadFunction?: LoadFunctionType;
	private lastCount: number = 0;

	//date of newest message
	//this helps in pagination
	private dayZeroDate?: number;
	private loadedOldestDate?: number;
	private loadedNewestDate?: number;

	private loadedLargestIndex: number = -1;
	private loadedSmallestIndex: number = 0;

	#isAtBottom?: boolean;

	constructor() {
		this.currentItems = [];
		this.currentPage = 0;
		this.#lastLoadDirection = LoadDirection.NONE;
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
			skip: this.loadedLargestIndex + 1,
			limit: BATCH_SIZE,
			date: this.dayZeroDate ? new Date(this.dayZeroDate) : undefined,
		};
		this.#lastLoadDirection = direction;
		const loaded_items = await this.loadFunction(search_query);

		//first we copy the items into temp_chats so we can sort them and then assign their indexes
		const temp_chats = loaded_items
			.map((r, i) => new ChatItem(-1, r))
			.sort((a, b) => a._created_time - b._created_time);

		const final_chats = temp_chats
			.reverse()
			.map((r, i) => new ChatItem(this.loadedLargestIndex + i + 1, r))
			.reverse();
		this.add_items_to_list(final_chats, direction);
	}

	private remove_items(count: number, direction: LoadDirection = LoadDirection.UP) {
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
	}
	private add_items_to_list(
		items: ChatItem[],
		direction: LoadDirection = LoadDirection.UP
	) {
		if (items.length === 0) return; //nothing is added

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
				400,
				this
			);
		}
	}
	setItems(items: ChatItem[]) {
		this.currentItems = items;
		this.#lastCountChange = this.currentItems.length - this.lastCount;
		const isAdding = this.#lastCountChange > 0;

		this.lastCount = this.currentItems.length;

		const timeMap = this.currentItems.map((r) => r._created_time);
		const indexMap = this.currentItems.map((r) => r.index);

		/* --------------------- information about current data --------------------- */
		this.loadedOldestDate = Math.min(...timeMap);
		this.loadedNewestDate = Math.max(...timeMap);
		this.loadedLargestIndex = Math.max(...indexMap);
		this.loadedSmallestIndex = Math.min(...indexMap);
		/* -------------------------------------------------------------------------- */
		//
		if (!this.dayZeroDate && this.loadedNewestDate > 0) {
			//first time loading items
			//find the newest date so we can use it as reference
			this.dayZeroDate = this.loadedNewestDate;
		}
		this.#isAtBottom = !this.dayZeroDate || this.loadedNewestDate >= this.dayZeroDate;
		//console.log('dayZeroDate', this.#dayZeroDate);
		//console.log('loadedNewestDate', this.#loadedNewestDate);
		//console.log('diff', this.#loadedNewestDate - (this.#dayZeroDate || 0));
		//console.log('isAtBottom', this.#isAtBottom);
		console.log('set items:', this.currentItems);
		if (this.setItemsFunction) this.setItemsFunction(this.currentItems);
	}
	/* --------------------------------- getters -------------------------------- */
	get isAtTop() {
		return false;
	}
	get isAtBottom() {
		return this.#isAtBottom;
	}

	/* number of changed items in the last load */
	get lastCountChange() {
		return this.#lastCountChange;
	}
	get lastLoadDirection(): LoadDirection {
		return this.#lastLoadDirection as LoadDirection;
	}
}
export default ChatManager;
