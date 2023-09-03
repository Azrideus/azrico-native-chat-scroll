export * from '../views/ChatList';
import React from 'react';

import ChatList from '../views/ChatList';
import examplechats from './examplechats.json';
function makeMsg(index, date) {
	const template = examplechats[index % examplechats.length];

	return {
		user: template.user,
		text: template.text,
		date: date,
	};
}
export function ExampleChatScroll() {
	const [newItems, set_newItems] = React.useState<any[]>([]);
	const autoSend = React.useRef(true);
	const msgNo = React.useRef(1);

	const loadFunction = React.useCallback(async ({ skip, limit }) => {
		return (await new Promise((resolve, reject) => {
			setTimeout(() => {
				//load max of 300 items
				if (skip > 300) resolve([]);
				resolve(
					Array.from('0'.repeat(limit)).map((r, i) => {
						return makeMsg(i, `${1 + i + skip} days ago`);
					})
				);
			}, Math.random() * 1000 + 500);
		})) as any[];
	}, []);

	React.useEffect(() => {
		setInterval(() => {
			if (autoSend.current) {
				//set_newItems((s) => {
				//	const newMsg = makeMsg(s.length + 1, `after ${msgNo.current} days`);
				//	return [...s, newMsg];
				//});
				msgNo.current++;
			}
		}, 5000);
	}, []);

	return (
		<ChatList
			newItems={newItems}
			ItemRender={ItemRender}
			HeaderItem={HeaderItem}
			loadFunction={loadFunction}
			batchSize={30}
		/>
	);
}

function HeaderItem(props) {
	const item = props.item;
	return <div>nothing more to see</div>;
}
function ItemRender(props) {
	const item = props.item;
	const index = props.index;

	return (
		<div
			style={{
				height: 'max-content',
				padding: '5px',
			}}
		>
			<div
				style={{
					border: '2px solid black',
					background: 'snow',
					height: '100%',
					borderRadius: 6,
					padding: '5px',
				}}
			>
				<b>{item.user}</b>
				<p>{item.text}</p>
				<p>{item.date}</p>
			</div>
		</div>
	);
}
export default ExampleChatScroll;
