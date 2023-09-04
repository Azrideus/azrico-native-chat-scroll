import React from 'react';
import VirtualScroller from '../index';
import examplechats from './examplechats.json';

const MAX_OLD_MESSAGES = 200;
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
				if (skip > MAX_OLD_MESSAGES) {
					return []; //nothing to load
				}
				if (skip + limit > MAX_OLD_MESSAGES) {
					limit = Math.max(0, MAX_OLD_MESSAGES - skip);
				}
				resolve(
					Array.from('0'.repeat(limit)).map((r, i) => {
						return makeMsg(i, `${1 + i + skip} days ago`);
					})
				);
			}, Math.random() * 1000 + 500);
		})) as any[];
	}, []);

	React.useEffect(() => {
		//setInterval(() => {
		//	if (autoSend.current) {
		//		//set_newItems((s) => {
		//		//	const newMsg = makeMsg(s.length + 1, `after ${msgNo.current} days`);
		//		//	return [...s, newMsg];
		//		//});
		//		msgNo.current++;
		//	}
		//}, 5000);
	}, []);

	return (
		<VirtualScroller
			ItemRender={ItemRender}
			BottomContent={BottomContent}
			TopContent={TopContent}
			WrapperContent={LoadingArea}
			loadFunction={loadFunction}
			// batchSize={30}
		/>
	);
}

function TopContent(props) {
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
				maxWidth: '200px',
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

function LoadingArea() {
	return <div>Loading</div>;
}
function BottomContent() {
	return <div>End of chat</div>;
}
export default ExampleChatScroll;
