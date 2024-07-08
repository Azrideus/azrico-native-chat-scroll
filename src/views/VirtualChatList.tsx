import React, { Context } from 'react';
import { UIDHelper, useForceUpdate } from '../classes/HelperFunctions';
import { ChatItem, ItemData } from '../classes/ChatItem';
import ChatManager, { LoadFunctionType } from '../classes/ChatManager';
import { useChatManager } from '../hooks/useChatManager';

import { useChatQuery } from '../hooks';
import {
	Virtuoso,
	VirtuosoGridProps,
	VirtuosoProps,
	ListProps,
	ItemProps,
	Components,
} from '@azrico/react-virtuoso';

/* -------------------------------------------------------------------------- */
type ItemPropsType = any;
type VirtualScrollerProps = {
	loadFunction: LoadFunctionType;
	ItemRender: React.ElementType<ItemRenderProps>;
	/* -------------------------------------------------------------------------- */
	gridProps?: VirtuosoProps<any, any>;
	/* -------------------------------------------------------------------------- */
	newItems?: ItemData[];
	WrapperContent?: React.ReactNode;
	BottomContent?: React.ReactNode;
	TopContent?: React.ReactNode;
	components?: Partial<{ Item: string; List: string }>;
	/* -------------------------------------------------------------------------- */
	managerRef?: React.MutableRefObject<ChatManager | undefined>;
	className?: string;
	itemClassName?: string;
	innerClassName?: string;
	itemProps?: ItemPropsType;
	debug?: boolean;
};

/**
 * Advanced Virtual scrolling
 * use the debug prop to enable logs
 * @param props
 */
export function VirtualChatList(props: VirtualScrollerProps) {
	return <VirtualChatListInner {...props} />;
}

/* -------------------------------------------------------------------------- */

const List = (customprops) =>
	React.forwardRef<any, ListProps & { context?: Context<unknown> }>((props, ref) => {
		const finalprops = {
			...customprops,
			...props,
			style: { ...props.style, listStyleType: 'none' },
			ref: ref,
		};
		return React.createElement(customprops.component ?? 'ul', finalprops, props.children);
	});
const Item = (customprops) =>
	React.forwardRef<HTMLLIElement, ItemProps<any> & { context?: Context<unknown> }>(
		(props, ref) => {
			const { item, ...restprops } = props;
			const [updateKey, forceUpdate] = useForceUpdate();
			if (!item) return <li>no item</li>;

			item.itemref = ref;
			item.refreshFunction = forceUpdate;
			const finalprops = {
				...restprops,
				key: updateKey,
				id: 'msg-' + item._id,
				ref: ref,
			};
			return React.createElement(
				customprops.component ?? 'li',
				finalprops,
				props.children
			);
		}
	);

/* -------------------------------------------------------------------------- */
/**
 * Advanced Virtual scrolling
 * use the debug prop to enable logs
 * @param props
 */
function VirtualChatListInner(props: VirtualScrollerProps) {
	const listRef = React.useRef<any>();
	const chatManager = useChatManager({
		managerRef: props.managerRef,
		loadFunction: props.loadFunction,
		debug: props.debug,
	});
	const {
		currentItems,
		startReached,
		endReached,
		initialTopMostItemIndex,
		firstItemIndex,
		onScroll,
		isAtVeryTop,
		isAtVeryBottom,
	} = useChatQuery({
		chatManager: chatManager,
		listRef: listRef,
	});
	return (
		<Virtuoso
			{...props.gridProps}
			className={props.className}
			components={{
				List: List({
					className: props.innerClassName,
					component: props.components?.List,
				}) as any,
				Item: Item({ className: '', component: props.components?.Item }) as any,
				Footer: () => {
					return <>{isAtVeryBottom ? props.BottomContent : props.WrapperContent}</>;
				},
				Header: () => {
					return <>{isAtVeryTop ? props.TopContent : props.WrapperContent}</>;
				},
			}}
			/* -------------------------------------------------------------------------- */
			alignToBottom
			ref={listRef}
			onScroll={onScroll}
			style={{ height: '100%', width: '100%', overflowX: 'clip' }}
			firstItemIndex={firstItemIndex}
			initialTopMostItemIndex={initialTopMostItemIndex}
			/* -------------------------------------------------------------------------- */
			data={currentItems}
			startReached={startReached}
			endReached={endReached}
			followOutput="auto"
			itemContent={(index, item) => {
				return (
					<RowRender
						item={item}
						itemProps={props.itemProps}
						ItemRender={props.ItemRender}
					/>
				);
			}}
		/>
	);
}

type RowRenderProps = {
	item: ChatItem;
	itemProps?: ItemPropsType;
	ItemRender: React.ElementType<ItemRenderProps>;
};

function RowRender(props: RowRenderProps) {
	const chatitem = props.item;
	const itemdata = typeof chatitem === 'object' ? chatitem.data : chatitem;
	return (
		<props.ItemRender
			itemref={chatitem.itemref}
			chatitem={chatitem}
			item={itemdata}
			nextitem={chatitem.nextitem?.data}
			previtem={chatitem.previtem?.data}
			itemProps={props.itemProps}
		/>
	);
}
// const RowRender = React.memo((props: RowRenderProps) => {

// });

export type ItemRenderProps = {
	chatitem: ChatItem;
	item: ItemData;
	nextitem: ItemData;
	previtem: ItemData;
	itemref: any;
	itemProps: ItemPropsType;
};

export default VirtualChatList;
