export class ExampleChatLoader {
	private static itemsInDB: Array<{
		_id: string;
		user: string;
		text: string;
		date: Date;
	}> = [];

	static async loadExampleChats(props: any): Promise<any[]> {
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
				const res = searchedItems.slice(skip, skip + limit);
				console.log('loadItemsFromDB', props);
				resolve(res);
			}, Math.random() * 1000 + 500);
		});
	}
	static addExampleChat(r: any) {
		ExampleChatLoader.itemsInDB.unshift({
			...r,
			_id: r['_id'] ?? 'oldmsg-' + ExampleChatLoader.itemsInDB.length,
			user: r['user'] ?? r['User Name'],
			text: r['text'] ?? r['Content'],
			date: new Date(r['Date'] ?? r['_created_date']),
		});
	}
	static getExampleChatLenght() {
		return ExampleChatLoader.itemsInDB.length;
	}
}
export default ExampleChatLoader;
