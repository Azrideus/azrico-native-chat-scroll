import '../styles/styles.css';
import React from 'react';
import { useSize, currentDistanceToBottom, sizeResult } from '../classes/SizeHelper';
import { ChatItem } from '../classes/ChatItem';
import ChatManager, {
	LoadFunctionType,
	LoadDirection,
	ChangeOperation,
} from '../classes/ChatManager';


  

type VirtualScrollerProps = {
	newItems?: any[];
	ItemRender: React.ElementType<any>;
	WrapperContent?: React.ElementType<any>;
	BottomContent?: React.ElementType<any>;
	TopContent?: React.ElementType<any>;
	loadFunction: LoadFunctionType;
	managerRef?: React.MutableRefObject<ChatManager | null>;
};

type ItemType = {
	key: string;
	data: any;
};
/**
 * Advanced Virtual scrolling
 * @param props
 */
export function VirtualScroller(props: VirtualScrollerProps) {
	//
	const innerRef = React.useRef<HTMLDivElement>(null);
	const outerRef = React.useRef<HTMLDivElement>(null);
	const bottomElementRef = React.useRef<HTMLDivElement>(null);

	const loadingFlag = React.useRef<boolean>(false);

	const [updateKey, forceUpdate] = React.useReducer((x) => (x + 1) % 100, 0);
	const [currentItems, set_currentItems] = React.useState<ChatItem[]>([]);
	const [chatManager, set_chatManager] = React.useState(new ChatManager());

	if (props.managerRef) props.managerRef.current = chatManager;
	/* -------------------------------------------------------------------------- */
	/*                         load new items when needed                         */
	/* -------------------------------------------------------------------------- */
	React.useLayoutEffect(() => {
		chatManager.set_loadFunction(props.loadFunction);
		chatManager.set_setItemsFunction(setItems);
		chatManager.set_refreshFunction(forceUpdate);
	}, []);

	async function setItems(items: ChatItem[]) {
		return await new Promise((resolve) => {
			set_currentItems((s) => {
				resolve(items);
				return items;
			});
		});
	}
	/* ------------------ load if reaching end or start of page ----------------- */
	async function checkShouldLoad() {
		if (loadingFlag.current) return;
		if (chatManager.shouldLoadTop || chatManager.shouldLoadDown) {
			if (loadingFlag.current) return;
			try {
				loadingFlag.current = true;
				await chatManager.loadIfNeeded();
			} finally {
				loadingFlag.current = false;
			}
		}
	}

	/* ---------------------------- scroll to bottom ---------------------------- */
	React.useLayoutEffect(() => {
		bottomElementRef.current?.scrollIntoView({});
		checkShouldLoad();
	}, [bottomElementRef.current]);

	/* -------------------------------------------------------------------------- */
	/*                               Check load page                              */
	/* -------------------------------------------------------------------------- */

	function _onScroll(e) {
		updateDistances();
		checkShouldLoad();
	}
	function updateDistances() {
		chatManager.distanceToBottom = currentDistanceToBottom(
			innerRef.current as any,
			outerRef.current as any
		);
		chatManager.distanceToTop = (outerRef.current as any).scrollTop;
		chatManager.isSticky = chatManager.distanceToBottom < 50;
	}

	/* -------------------------------------------------------------------------- */
	/*            prevent the scroller from jumping when you add items            */
	/* -------------------------------------------------------------------------- */
	React.useLayoutEffect(() => {
		if (!outerRef.current || !innerRef.current) return;
		const itemDelta = chatManager.lastCountChange;
		const lastOp = chatManager.lastOperation;
		if (itemDelta === 0 || lastOp == ChangeOperation.NONE) return;

		// console.log('manager jump:', jumpDistance);
		// let _stickToTop = false;
		// let _stickToBot = false;

		// switch (lastOp) {
		// 	case ChangeOperation.ADD_UP:
		// 		//adding items to top, stick to bot
		// 		_stickToBot = true;
		// 		break;
		// 	case ChangeOperation.ADD_DOWN:
		// 		//if adding few items to bottom of the list we can stick to the bottom
		// 		if (chatManager.isSticky && itemDelta < 5) _stickToBot = true;
		// 		break;
		// 	case ChangeOperation.REMOVE_UP:
		// 		break;
		// 	case ChangeOperation.REMOVE_DOWN:
		// 		//removing from bottom of the list. stick to top
		// 		_stickToTop = true;
		// 		break;
		// }

		if (chatManager.isSticky && itemDelta < 5) {
			stickToBottom();
		} else {
			const jumpDistance = chatManager.referenceTop - chatManager.referenceLastTop;
			const newScrollPosition = (outerRef.current as any).scrollTop + jumpDistance;
			(outerRef.current as any).scrollTop = newScrollPosition;
		}

		// //console.log('isSticky', chatManager.isSticky);
		// //console.log('lastOp', lastOp, 'lcd', lcd, 'lld', lld);
		// // console.log('stickToBot', _stickToBot, '_stickToTop', _stickToTop);
		// if (_stickToBot) {
		// 	stickToBottom();
		// } else if (_stickToTop) {
		// 	stickToTop();
		// }
	}, [currentItems]);
	function stickToBottom() {
		/* ---------------------- keep same distance to bottom ---------------------- */
		const jumpDistance =
			currentDistanceToBottom(innerRef.current as any, outerRef.current as any) -
			chatManager.distanceToBottom;
		const newScrollPosition = (outerRef.current as any).scrollTop + jumpDistance;
		(outerRef.current as any).scrollTop = newScrollPosition;
		// updateDistances();
	}

	/* -------------------------------------------------------------------------- */
	/*                             render the scroller                            */
	/* -------------------------------------------------------------------------- */

	return (
		<div
			ref={outerRef}
			className="azchat-filler azchat-virtualContainer"
			style={
				{
					'--WRAPPER_HEIGHT': ChatManager.WRAPPER_HEIGHT,
				} as any
			}
			onScroll={_onScroll}
		>
			<div ref={innerRef}>
				{chatManager.isAtTop && props.TopContent && <props.TopContent />}
				<div className={'azchat-wrapper'}>
					{!chatManager.isAtTop && props.WrapperContent && <props.WrapperContent />}
				</div>

				<ol>
					{currentItems.map((r, index) =>
						RowRender({ ...props, chatitem: r, index: index })
					)}
				</ol>

				<div className={'azchat-wrapper'}>
					{!chatManager.isAtBottom && props.WrapperContent && <props.WrapperContent />}
				</div>
				<div ref={bottomElementRef}>
					{chatManager.isAtBottom && props.BottomContent && <props.BottomContent />}
				</div>
			</div>
		</div>
	);
}

type RowRenderProps = VirtualScrollerProps & { chatitem: ChatItem; index: number };

function RowRender(props: RowRenderProps) {
	let content: any = null;
	const chatitem = props.chatitem;

	if (props.ItemRender) content = <props.ItemRender item={chatitem.data} />;
	else content = 'item';

	return (
		<li
			ref={(v) => (chatitem.itemRef = v as HTMLElement)}
			key={chatitem.key}
			id={'message-' + chatitem.key}
			className={'azchat-item'}
		>
			{content}
		</li>
	);
}
export default VirtualScroller;
