import React from 'react';
import VirtualScroller from 'react-chatscroll';
import examplechats from './examplechats.json';

const MAX_OLD_MESSAGES = 200;
function makeMsg(index, date) {
	if (typeof index === 'number') {
		const template = examplechats[index % examplechats.length];
		return {
			user: template.user,
			text: template.text,
			date: date,
		};
	} else {
		return {
			user: 'me',
			text: index,
			date: date,
		};
	}
}
export function ExampleChatScroll() {
	const [newItems, set_newItems] = React.useState<any[]>([]);
	const [message, set_message] = React.useState('');
	const msgNo = React.useRef(1);

	const loadFunction = React.useCallback(async ({ skip, limit }) => {
		return await new Promise((resolve, reject) => {
			setTimeout(() => {
				if (skip > MAX_OLD_MESSAGES) {
					return []; //nothing to load
				}
				if (skip + limit > MAX_OLD_MESSAGES) {
					limit = Math.max(0, MAX_OLD_MESSAGES - skip);
				}
				resolve(
					Array.from('0'.repeat(limit)).map((r, i) => {
						const msgIndex = 1 + i + skip;
						return makeMsg(msgIndex, `${msgIndex} hours ago`);
					})
				);
			}, Math.random() * 1000 + 500);
		});
	}, []);

	React.useEffect(() => {
		setInterval(() => {
			set_newItems((s) => {
				return [...s, { user: 'Ray', text: 'hey', date: new Date() }];
			});
			msgNo.current++;
		}, 5000);
	}, []);

	function handleChatSubmit(e) {
		e.preventDefault();
		const newMsg = makeMsg(message, new Date());
		set_newItems((s) => [...s, newMsg]);
		set_message('');
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
						newItems={newItems}
						ItemRender={ItemRender}
						BottomContent={BottomContent}
						TopContent={TopContent}
						WrapperContent={LoadingArea}
						loadFunction={loadFunction}
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
	return <div>nothing more to see</div>;
}
function ItemRender(props) {
	const item = props.item;
	const index = props.index;

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
				<b>{item.user}</b>
				<p style={{ whiteSpace: 'pre-line' }}>{item.text}</p>
				<p>{formatDate(item.date)}</p>
			</div>
		</div>
	);
}

function formatDate(inputDate) {
	if (inputDate instanceof Date) {
		return (
			inputDate.getHours() + ':' + inputDate.getMinutes() + ':' + inputDate.getSeconds()
		);
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
