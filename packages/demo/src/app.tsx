import React from 'react';
import VirtualScroller from 'react-chatscroll';
import examplechats from './examplechats.json';
import ChatManager from '../../source/src/classes/ChatManager';

let newMessageId = 0;

const itemsInDB = examplechats.map((r, i) => {
	return {
		_id: i,
		user: r['User Name'],
		text: r['Content'],
		date: new Date(r['Date']),
		...r,
	};
});
async function loadItemsFromDB(props: any): Promise<any[]> {
	let { skip, limit, _created_date, exclude, sort } = props;
	return await new Promise((resolve, reject) => {
		setTimeout(() => {
			let searchedItems: any[] = [...itemsInDB];

			if (_created_date.$gt instanceof Date) {
				const dtTime = _created_date.$gt.getTime();
				searchedItems = searchedItems.filter((s) => (s.date as Date).getTime() >= dtTime);
			}
			if (_created_date.$lt instanceof Date) {
				const dtTime = _created_date.$lt.getTime();
				searchedItems = searchedItems.filter((s) => (s.date as Date).getTime() <= dtTime);
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

export function ExampleChatScroll() {
	const [message, set_message] = React.useState('');
	const managerRef = React.useRef<ChatManager>(null);
	const timerRef = React.useRef<any>();

	async function addNewMsg(obj) {
		itemsInDB.unshift(obj);
		await managerRef.current?.sendNewMessage(obj);
	}
	async function addLoop() {
		const newMsg = {
			user: 'spammer',
			text: 'spam: ' + ++newMessageId,
			date: new Date(),
		};
		if (itemsInDB.length > 1000) return;
		await addNewMsg(newMsg);
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(addLoop, 7000);
	}
	React.useEffect(() => {
		addLoop();
	}, []);
	function handleChatSubmit(e) {
		e.preventDefault();
		if (message) {
			const newMsg = {
				user: 'me',
				text: message,
				date: new Date(),
			};
			addNewMsg(newMsg);
			set_message('');
		}

		return false;
	}
	return (
		<div
			style={{
				overflow: 'hidden',
				height: '100%',
				position: 'relative',
				flexDirection: 'row',
				display: 'flex',
			}}
		>
			<div
				style={{
					width: '300px',
				}}
			>
				<p>Sidebar</p>
			</div>
			<div
				style={{
					overflow: 'hidden',
					flex: 1,
					display: 'flex',
					flexDirection: 'column',

					height: '100%',
				}}
			>
				<div
					style={{
						overflow: 'hidden',
						border: '1px solid black',
						flex: 1,
					}}
				>
					<VirtualScroller
						managerRef={managerRef}
						ItemRender={ItemRender}
						BottomContent={BottomContent}
						TopContent={TopContent}
						WrapperContent={LoadingArea}
						loadFunction={loadItemsFromDB}
						// batchSize={30}
					/>
				</div>
				<form
					onSubmit={handleChatSubmit}
					style={{
						boxSizing: 'border-box',
						padding: 5,
						width: '100%',
						flexDirection: 'row',
						display: 'flex',
						minHeight: '40px',
					}}
				>
					<input
						value={message}
						onChange={(e) => set_message(e.target.value)}
						style={{ flex: 1 }}
					/>
					<button onClick={handleChatSubmit}>Send</button>
				</form>
			</div>
		</div>
	);
}

function TopContent(props) {
	const item = props.item;
	return <div>You have reached the top of the list</div>;
}
function ItemRender(props) {
	const item = props.item;
	if (!item) return <div>item</div>;

	const isByMe = item.user === 'me';

	return (
		<div
			style={{
				height: 'max-content',
				padding: '5px',
				display: 'flex',
				flexDirection: 'column',
				alignItems: isByMe ? 'flex-end' : 'flex-start',
			}}
		>
			<div
				style={{
					maxWidth: '300px',
					minWidth: '200px',
					border: '2px solid black',
					background: isByMe ? '#32a852' : 'snow',
					height: '100%',
					borderRadius: 6,
					padding: '5px',
				}}
			>
				<div
					style={{ display: 'flex', flexDirection: 'row', gap: 5, alignItems: 'center' }}
				>
					<img src={item['Avatar URL']} style={{ height: 32, width: 32 }}></img>
					<b>{item.user}</b>
				</div>

				<p style={{ whiteSpace: 'pre-line' }}>{item.text}</p>
				<p>{formatDate(item.date)}</p>
			</div>
		</div>
	);
}

function formatDate(inputDate) {
	if (inputDate instanceof Date) {
		return inputDate.getHours() + ':' + inputDate.getMinutes();
	}
	return inputDate;
}

function LoadingArea() {
	return <div>Loading</div>;
}
function BottomContent() {
	return <div>End of chat</div>;
}
export default ExampleChatScroll;
