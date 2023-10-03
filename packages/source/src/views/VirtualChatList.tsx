import '../styles/styles.css';
import React from 'react';
import { useSize, currentDistanceToBottom, sizeResult } from '../classes/SizeHelper';
import { ChatItem, ItemData } from '../classes/ChatItem';
import ChatManager, {
	LoadFunctionType,
	LoadDirection,
	ChangeOperation,
} from '../classes/ChatManager';

type ItemPropsType = any;
type VirtualScrollerProps = {
	newItems?: ItemData[];
	ItemRender: React.ElementType<ItemRenderProps>;
	WrapperContent?: React.ElementType<any>;
	BottomContent?: React.ElementType<any>;
	TopContent?: React.ElementType<any>;
	loadFunction: LoadFunctionType;
	managerRef?: React.MutableRefObject<ChatManager | undefined>;
	className?: string;
	itemClassName?: string;
	innerClassName?: string;
	itemProps?: ItemPropsType;
};

/**
 * Advanced Virtual scrolling
 * @param props
 */
export function VirtualChatList(props: VirtualScrollerProps) {
	//
	const innerRef = React.useRef<HTMLDivElement>(null);
	const outerRef = React.useRef<HTMLDivElement>(null);
	const bottomElementRef = React.useRef<HTMLDivElement>(null);

	const firtLoad = React.useRef<boolean>(true);
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

	/* ------------------------------ initial load ------------------------------ */
	React.useEffect(() => {
		checkShouldLoad();
	}, []);
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

	/* -------------------------------------------------------------------------- */
	/*                               Check load page                              */
	/* -------------------------------------------------------------------------- */

	function _onScroll(e: any) {
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
		if (lastOp === ChangeOperation.NONE) return;

		if (chatManager.lastDBLoad > 0 && firtLoad.current) {
			firtLoad.current = false;
			return stickToBottom();
		}
		if (Number.isNaN(chatManager.referenceLastTop)) {
			//fist load, stick to bottom
			return stickToBottom();
		}
		if (chatManager.isSticky && Math.abs(itemDelta) < 5) {
			//sticky to bottom
			return stickToBottom();
		}

		{
			//keep the same distance to the reference message
			const jumpDistance = chatManager.referenceTop - chatManager.referenceLastTop;
			const newScrollPosition = (outerRef.current as any).scrollTop + jumpDistance;
			(outerRef.current as any).scrollTop = newScrollPosition;
			// console.log('jumpDistance:', jumpDistance);
		}
	}, [currentItems]);

	function stickToBottom() {
		(outerRef.current as any).scrollTop = outerRef.current?.scrollHeight;
	}
	// React.useEffect(() => {
	// 	console.log(currentItems);
	// }, [currentItems]);
	/* -------------------------------------------------------------------------- */
	/*                             render the scroller                            */
	/* -------------------------------------------------------------------------- */

	return (
		<div
			ref={outerRef}
			className={'azchat-filler azchat-virtualContainer ' + props.className}
			style={
				{
					'--WRAPPER_HEIGHT': ChatManager.WRAPPER_HEIGHT,
				} as any
			}
			onScroll={_onScroll}
		>
			<div ref={innerRef} className={'azchat-inner-container ' + props.innerClassName}>
				{chatManager.isAtTop && props.TopContent && <props.TopContent />}
				{!chatManager.isAtTop && (
					<div className={'azchat-wrapper wrapper-top'}>
						{!chatManager.isAtTop && props.WrapperContent && <props.WrapperContent />}
					</div>
				)}

				<ol>
					{currentItems.map((r, index) => {
						return (
							<RowRender
								className={props.itemClassName}
								ItemRender={props.ItemRender}
								key={r.key}
								itemProps={props.itemProps}
								item={r}
								nextitem={r.nextitem}
								previtem={r.previtem}
							/>
						);
					})}
				</ol>
				{!chatManager.isAtBottom && (
					<div className={'azchat-wrapper wrapper-bottom'}>
						{props.WrapperContent && <props.WrapperContent />}
					</div>
				)}

				<div ref={bottomElementRef}>
					{chatManager.isAtBottom && props.BottomContent && <props.BottomContent />}
				</div>
			</div>
		</div>
	);
}

type RowRenderProps = {
	item: ChatItem;
	nextitem?: ChatItem;
	previtem?: ChatItem;
	itemProps?: ItemPropsType;
	className?: string;
	ItemRender: React.ElementType<ItemRenderProps>;
};
export type ItemRenderProps = {
	item: ItemData;
	nextitem: ItemData;
	previtem: ItemData;
	itemref: any;
	itemProps: ItemPropsType;
	chatitem: ChatItem;
};
const RowRender = React.memo((props: RowRenderProps) => {
	const itemref = React.useRef<any>();

	const chatitem = props.item;
	chatitem.itemref = itemref;
	return (
		<li
			ref={itemref}
			key={chatitem.key}
			id={'msg-' + chatitem.key}
			className={'azchat-item' + props.className ? ` ${props.className}` : ''}
		>
			<props.ItemRender
				itemref={itemref}
				chatitem={chatitem}
				item={chatitem.data}
				nextitem={props.nextitem?.data}
				previtem={props.previtem?.data}
				itemProps={props.itemProps}
			/>
		</li>
	);
});
 
export default VirtualChatList;
