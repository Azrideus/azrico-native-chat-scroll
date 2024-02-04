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
	static async loadExampleChats(props: Partial<ExampleSearchProps>): Promise<any[]> {
		let { skip, limit, _created_date, exclude, sort } = props;
		return await new Promise((resolve, reject) => {
			setTimeout(() => {
				let searchedItems: any[] = [...ExampleChatLoader.itemsInDB];

				if (_created_date) {
					if (_created_date.$gte instanceof Date) {
						const dtTime = _created_date.$gte.getTime();
						searchedItems = searchedItems.filter(
							(s) => (s.date as Date).getTime() >= dtTime
						);
					}
					if (_created_date.$lte instanceof Date) {
						const dtTime = _created_date.$lte.getTime();
						searchedItems = searchedItems.filter(
							(s) => (s.date as Date).getTime() <= dtTime
						);
					}
				}

				if (Array.isArray(exclude)) {
					searchedItems = searchedItems.filter((s) => !exclude.includes(s._id));
				}
				if (sort._created_date) {
					const sortdir = sort._created_date;
					searchedItems.sort(
						(a, b) => (a.date.getTime() - b.date.getTime()) * sortdir
					) as any[];
				}
				//apply the skip and limit rules:
				if (!skip) skip = 0;
				const res = searchedItems.slice(skip, skip + Number(limit ?? 0));
	 
				resolve(res);
			}, Math.random() * 1000 + 500);
		});
	}
	/**
	 * add an example message to the test chat list
	 * @param newmsg
	 */
	static addExampleChat(newmsg: any) {
		ExampleChatLoader.itemsInDB.unshift({
			...newmsg,
			_id: newmsg['_id'] ?? 'oldmsg-' + ExampleChatLoader.itemsInDB.length,
			user: newmsg['user'] ?? newmsg['User Name'],
			text: newmsg['text'] ?? newmsg['Content'],
			date: new Date(newmsg['date'] ?? newmsg['Date'] ?? newmsg['_created_date']),
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
