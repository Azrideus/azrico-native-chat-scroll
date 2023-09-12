import '../styles/styles.css';
import React from 'react';
import { useSize, currentDistanceToBottom, sizeResult } from '../classes/SizeHelper';
import { ChatItem } from '../classes/ChatItem';
import ChatManager, {
	LoadFunctionType,
	LoadDirection,
	ChangeOperation,
} from '../classes/ChatManager';

const WRAPPER_HEIGHT = 400;

const DEFAULT_BATCH_SIZE = 20;
const MAX_ITEMS = 80;

type VirtualScrollerProps = {
	newItems?: any[];
	ItemRender: React.ElementType<any>;
	WrapperContent?: React.ElementType<any>;
	BottomContent?: React.ElementType<any>;
	TopContent?: React.ElementType<any>;
	loadFunction: LoadFunctionType;
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

	const distanceToBottom = React.useRef<number>(0);
	const distanceToTop = React.useRef<number>(0);
	const loadingFlag = React.useRef<boolean>(false);

	const [currentItems, set_currentItems] = React.useState<ChatItem[]>([]);
	const [chatManager, set_chatManager] = React.useState(new ChatManager());

	/* -------------------------------------------------------------------------- */
	/*                         load new items when needed                         */
	/* -------------------------------------------------------------------------- */
	React.useLayoutEffect(() => {
		chatManager.set_loadFunction(props.loadFunction);
		chatManager.set_setItemsFunction((r) => set_currentItems(r));
	}, []);
	async function loadItems(direction = 0) {
		if (loadingFlag.current) return;
		try {
			loadingFlag.current = true;

			await chatManager.load_items(direction);
		} finally {
			loadingFlag.current = false;
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
	const [isSticky, set_isSticky] = React.useState<boolean>(false);

	function _onScroll(e) {
		updateDistances();
		checkShouldLoad();
	}
	function updateDistances() {
		distanceToBottom.current = currentDistanceToBottom(
			innerRef.current as any,
			outerRef.current as any
		);
		distanceToTop.current = (outerRef.current as any).scrollTop;
		set_isSticky(distanceToBottom.current < 50);
	}

	/* ------------------ load if reaching end or start of page ----------------- */
	function checkShouldLoad() {
		if (loadingFlag.current) return;
		if (distanceToTop.current < WRAPPER_HEIGHT && !chatManager.isAtTop) {
			loadItems(1);
		} else if (distanceToBottom.current < WRAPPER_HEIGHT && !chatManager.isAtBottom) {
			loadItems(-1);
		}
	}

	//React.useEffect(() => {
	//	if (!outerRef.current || !innerRef.current) return;
	//	if (lastLoadDirection.current == 0) return;
	//	const keysToDelete = Object.keys(deleteMap);
	//
	//	//we wait a litte for the newly created items to calculate their heigts
	//	//and for our scroller to update its scroll position based on the new items
	//	setTimeout(() => {
	//		if (keysToDelete.length > 0) {
	//			set_deleteMap({});
	//			set_itemsMap((oldmap) => {
	//				const newItemsMap = { ...oldmap };
	//				keysToDelete.forEach((d) => {
	//					delete newItemsMap[d];
	//				});
	//
	//				return newItemsMap;
	//			});
	//			return;
	//		}
	//	}, 400);
	//}, [deleteMap]);
	/* -------------------------------------------------------------------------- */
	/*            prevent the scroller from jumping when you add items            */
	/* -------------------------------------------------------------------------- */
	React.useLayoutEffect(() => {
		if (!outerRef.current || !innerRef.current) return;
		const itemDelta = chatManager.lastCountChange;
		const isAdding = itemDelta > 0;
		const lld = chatManager.lastLoadDirection;
		const lcd = chatManager.lastChangeDirection;
		const lastOp = chatManager.lastOperation;

		if (itemDelta === 0 || lcd === LoadDirection.NONE || lastOp == ChangeOperation.NONE)
			return;

		let _stickToTop = false;
		let _stickToBot = false;
		if (lastOp === ChangeOperation.ADD) {
			if (lld === LoadDirection.DOWN) {
				if (isSticky)
					if (itemDelta > 5) {
						//sticky is broken. no need to do anything
					} else _stickToBot = true; //sticky to bottom of the list
			} else if (lld === LoadDirection.UP) _stickToBot = true; //adding items to top, stick to bot
		} else {
			if (lcd === LoadDirection.DOWN) {
				//removing from bottom of the list. stick to top
				_stickToTop = true;
			}
		}
		// console.log('lastOp', lastOp, 'lcd', lcd, 'lld', lld);
		// console.log('ChangeOperation.ADD', ChangeOperation.ADD);
		// console.log('stickToBot', _stickToBot, '_stickToTop', _stickToTop);
		if (_stickToBot) {
			stickToBottom();
		} else if (_stickToTop) {
			stickToTop();
		}
	}, [currentItems]);

	function stickToBottom() {
		/* ---------------------- keep same distance to bottom ---------------------- */
		const jumpDistance =
			currentDistanceToBottom(innerRef.current as any, outerRef.current as any) -
			distanceToBottom.current;
		const newScrollPosition = (outerRef.current as any).scrollTop + jumpDistance;
		(outerRef.current as any).scrollTop = newScrollPosition;
		// updateDistances();
	}
	function stickToTop() {
		/* ------------------------ keep same distance to top ----------------------- */
		(outerRef.current as any).scrollTop = distanceToTop.current;
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
					'--WRAPPER_HEIGHT': WRAPPER_HEIGHT,
				} as any
			}
			onScroll={_onScroll}
		>
			<div ref={innerRef}>
				{chatManager.isAtTop && props.TopContent && <props.TopContent />}
				<div className={'azchat-wrapper' + (chatManager.isAtTop ? ' gone' : '')}>
					{props.WrapperContent && <props.WrapperContent />}
				</div>

				<ol>
					{currentItems.map((r, index) =>
						RowRender({ ...props, chatitem: r, index: index })
					)}
				</ol>

				<div className={'azchat-wrapper' + (chatManager.isAtBottom ? ' gone' : '')}>
					{props.WrapperContent && <props.WrapperContent />}
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
		<li key={chatitem.key} id={'message-' + chatitem.key} className={'azchat-item'}>
			{content}
		</li>
	);
}
export default VirtualScroller;
