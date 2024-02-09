import React from 'react';
import VirtualChatList, {
	ChatItem,
	ChatManager,
	TestChatLoader,
} from '@azrideus/react-chat-scroll';

/* ------------------------------ initial chats ----------------------------- */
import examplechats from './examplechats.json';
examplechats.forEach(TestChatLoader.addExampleChat);

export function Examplechatscroll() {
	const [message, set_message] = React.useState('');
	const managerRef = React.useRef<ChatManager>();
	const timerRef = React.useRef<any>();

	async function addNewMsg(obj: any) {
		TestChatLoader.addExampleChat(obj);
		await managerRef.current?.sendNewMessage(obj);
	}
	async function addLoop(firsttime = false) {
		if (TestChatLoader.getExampleChatLenght() > 1000) return;
		if (!firsttime) {
			const newMsg = {
				_id: 'spam-' + TestChatLoader.getExampleChatLenght(),
				_creator: 'spammer',
				text: 'spam: ' + TestChatLoader.getExampleChatLenght(),
				date: new Date(),
			};
			await addNewMsg(newMsg);
		}

		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(addLoop, 7000);
	}
	React.useEffect(() => {
		addLoop(true);
	}, []);
	function handleChatSubmit(e: any) {
		e.preventDefault();
		if (message) {
			const newMsg = {
				_id: 'new-' + TestChatLoader.getExampleChatLenght(),
				_creator: 'me',
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
					<VirtualChatList
						debug
						managerRef={managerRef as any}
						ItemRender={ItemRender}
						BottomContent={BottomContent}
						TopContent={TopContent}
						WrapperContent={LoadingArea}
						loadFunction={TestChatLoader.loadFunction}
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

function TopContent(props: any) {
	const item = props.item;
	return <div>You have reached the top of the list</div>;
}
function ItemRender(props: any) {
	const item = props.item;
	const chatitem = props.chatitem as ChatItem;
	const previtem = props.previtem;
	if (!item) return <div>item</div>;

	const isByMe = item._creator === 'me';
	const needProfile = previtem?._creator != item._creator;
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
					style={{
						display: 'flex',
						flexDirection: 'row',
						gap: 5,
						alignItems: 'center',
					}}
				>
					{needProfile && (
						<>
							<img src={item['Avatar URL']} style={{ height: 32, width: 32 }}></img>
							<b>{item._creator}</b>
						</>
					)}
					<button onClick={() => chatitem.Delete()}>delete</button>
					<button
						onClick={() => {
							chatitem.updateId('blahblah');
						}}
					>
						refresh
					</button>
				</div>

				<p style={{ whiteSpace: 'pre-line' }}>{item.text}</p>
				<p>{formatDate(item._created_date)}</p>
			</div>
		</div>
	);
}

function formatDate(inputDate: any) {
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
export default Examplechatscroll;
