import { ChatItem } from './ChatItem';
import { UIDHelper } from './UIDHelper';

//max number of items we keep in cache
const MAX_LOAD = 80;

//items we load in each batch
const BATCH_SIZE = 30;

export enum LoadDirection {
	UP = 1,
	DOWN = -1,
	NONE = 0,
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

	#loadFunction?: LoadFunctionType;
	#setItemsFunction?: SetItemsFunctionType;
	#lastLoadDirection: LoadDirection;
	#lastDelta: number = 0;
	#lastCount: number = 0;

	//date of newest message
	//this helps in pagination
	dayZeroDate?: Date;

	constructor() {
		this.currentItems = [];
		this.currentPage = 0;
		this.#lastLoadDirection = LoadDirection.NONE;
	}

	set_loadFunction(fnc: LoadFunctionType) {
		this.#loadFunction = fnc;
	}
	set_setItemsFunction(fnc: SetItemsFunctionType) {
		this.#setItemsFunction = fnc;
	}

	/**
	 * load more items in the given direction
	 * @param direction
	 */
	async load_items(direction: LoadDirection = LoadDirection.UP) {
		if (!this.#loadFunction) return;

		console.log('load more:', direction);
		const search_query: SearchQuery = {
			skip: 0,
			limit: BATCH_SIZE,
			date: this.dayZeroDate,
		};
		console.log('sq:', search_query);

		this.#lastLoadDirection = direction;
		const loaded_items = await this.#loadFunction(search_query);

		const loaded_chats = loaded_items.map((r) => new ChatItem(r));
		this.add_items_to_list(loaded_chats, direction);
	}

	private add_items_to_list(
		items: ChatItem[],
		direction: LoadDirection = LoadDirection.UP
	) {
		if (items.length === 0) return; //nothing is added

		if (this.currentItems.length === 0) {
			//first time loading items
			//find the newest date so we can use it as reference
			this.dayZeroDate = new Date(Math.max(...items.map((r) => r._created_time)));
			console.log('dayZeroDate:', this.dayZeroDate);
		}
		if (direction === LoadDirection.UP) {
			//add above the list
			this.currentItems.unshift(...items);
		} else {
			//add below the list
			this.currentItems.push(...items);
		}

		this.#lastDelta = this.currentItems.length - this.#lastCount;
		this.#lastCount = this.currentItems.length;

		if (this.#setItemsFunction) this.#setItemsFunction(this.currentItems);
	}
	/* --------------------------------- getters -------------------------------- */

	/* number of changed items in the last load */
	get lastDelta() {
		return this.#lastDelta;
	}
	get lastLoadDirection(): LoadDirection {
		return this.#lastLoadDirection as LoadDirection;
	}
	get isAtTop() {
		return false;
	}
	get isAtBottom() {
		return true;
	}
}
export default ChatManager;
