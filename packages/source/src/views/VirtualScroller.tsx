import '../styles/styles.css';
import React from 'react';
import { useSize, currentDistanceToBottom, sizeResult } from '../classes/SizeHelper';
import { ChatItem } from '../classes/ChatItem';
import ChatManager, { LoadFunctionType, LoadDirection } from '../classes/ChatManager';

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
		distanceToBottom.current = currentDistanceToBottom(
			innerRef.current as any,
			outerRef.current as any
		);
		distanceToTop.current = (outerRef.current as any).scrollTop;
		set_isSticky(distanceToBottom.current < 50);
		checkShouldLoad();
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

		if (itemDelta === 0 || chatManager.lastLoadDirection === LoadDirection.NONE) return;

		const shouldStickToBottom =
			(chatManager.lastLoadDirection === LoadDirection.DOWN && isSticky && isAdding) ||
			(chatManager.lastLoadDirection === LoadDirection.UP) == isAdding;

		//when adding items to bottom of the list and we try to remove items from above the list
		//there is no need to update scroll positions
		if (chatManager.lastLoadDirection === LoadDirection.DOWN && itemDelta > 0) return;

		//console.log('stick to bottom:', chatManager.lastLoadDirection, itemDelta);
		//console.log('stick to bottom:', shouldStickToBottom);
		if (shouldStickToBottom) {
			stickToBottom();
		} else {
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
	}
	function stickToTop() {
		/* ------------------------ keep same distance to top ----------------------- */
		(outerRef.current as any).scrollTop = distanceToTop.current;
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
