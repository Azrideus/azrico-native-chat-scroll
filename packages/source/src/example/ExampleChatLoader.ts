import { ChatManager } from './../classes/ChatManager';
import { ChatItem } from '../classes/ChatItem';
import { UIDHelper } from '../classes/UIDHelper';

type ExampleSearchProps = {
	skip: number;
	limit: number;
	_created_date: any;
	exclude: any;
	sort: any;
};
export class ExampleChatLoader {
	private static itemsInDB: Array<{
		_id: string;
		user: string;
		text: string;
		date: Date;
	}> = [];

	/**
	 * loader function for test chat list
	 * has delay of 500-1500ms
	 * @param props
	 * @returns
	 */
	static async loadFunction(props: Partial<ExampleSearchProps>): Promise<any[]> {
		let { skip, limit, _created_date, exclude, sort } = props;
		return await new Promise((resolve, reject) => {
			setTimeout(() => {
				let searchedItems: any[] = [...ExampleChatLoader.itemsInDB];

				if (_created_date) {
					if (_created_date.$gte instanceof Date) {
						const dtTime = _created_date.$gte.getTime();
						searchedItems = searchedItems.filter(
							(s) => ChatItem.getObjectDate(s).getTime() >= dtTime
						);
					}
					if (_created_date.$lte instanceof Date) {
						const dtTime = _created_date.$lte.getTime();
						searchedItems = searchedItems.filter(
							(s) => ChatItem.getObjectDate(s).getTime() <= dtTime
						);
					}
				}

				if (Array.isArray(exclude)) {
					searchedItems = searchedItems.filter((s) => !exclude.includes(s._id));
				}
				if (sort._created_date) {
					const sortdir = sort._created_date;
					searchedItems.sort((a, b) => ChatManager.item_sort(a, b, sortdir)) as any[];
				}
				//apply the skip and limit rules:
				if (!skip) skip = 0;
				const res = searchedItems.slice(skip, skip + Number(limit ?? 0));

				resolve(res);
			}, Math.random() * 1000 + 500);
		});
	}

	static clearExampleChats() {
		ExampleChatLoader.itemsInDB = [];
	}
	/**
	 * clear then set the example chats
	 * @param examplechats
	 * @returns
	 */
	static setExampleChats(examplechats: any[]) {
		this.clearExampleChats();
		examplechats.forEach(ExampleChatLoader.addExampleChat);
		return true;
	}
	/**
	 * add an example message to the test chat list
	 * @param newmsg
	 */
	static addExampleChat(newmsg: any) {
		ExampleChatLoader.itemsInDB.unshift({
			...newmsg,
			_id: newmsg['_id'] ?? `oldmsg-${UIDHelper.nextid()}`,
			text: newmsg['text'] ?? newmsg['Content'],
			_creator: newmsg['_creator'] ?? newmsg['user'],
			_created_date: newmsg['_created_date'] ?? newmsg['Date'] ?? newmsg['date'],
		});
		return true;
	}
	/**
	 * add an example message to the test chat list
	 * has delay of 200-400ms
	 * @param newmsg
	 */
	static async addExampleChatAsync(newmsg: any) {
		return await new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve(ExampleChatLoader.addExampleChat(newmsg));
			}, Math.random() * 200 + 200);
		});
	}
	static getExampleChatLenght() {
		return ExampleChatLoader.itemsInDB.length;
	}
}
export default ExampleChatLoader;
