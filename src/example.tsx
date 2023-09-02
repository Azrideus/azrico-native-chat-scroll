export * from './views/ChatList';
import React from 'react';

import ChatList from './views/ChatList';

export function ExampleChatScroll() {
	const [newItems, set_newItems] = React.useState<any[]>([]);

	const loadFunction = React.useCallback(async ({ skip, limit }) => {
		//load N items.
		if (skip < 20)
			return Array.from('0'.repeat(limit))
				.map((r, i) => i + skip)
				.reverse();
		return [];
	}, []);

	//React.useEffect(() => {
	//	setInterval(() => {
	//		const msgContent = Math.floor(Math.random() * 50);
	//		if (newItems.length < 200) set_newItems((s) => [...s, 'my age is ' + msgContent]);
	//	}, 2000);
	//}, []);
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
	return (
		<div
			style={{
				height: '100%',
				padding: 12,
				background: 'snow',
				border: '2px solid black',
				borderRadius: 6,
			}}
		>
			{item}
		</div>
	);
}
export default ExampleChatScroll;
