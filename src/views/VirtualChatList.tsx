import React, { Context } from 'react';
import { UIDHelper, useForceUpdate } from '../classes/HelperFunctions';
import { ChatItem, ItemData } from '../classes/ChatItem';
import ChatManager, { LoadFunctionType } from '../classes/ChatManager';
import { useChatManager } from '../hooks/useChatManager';

import { View } from 'react-native';
import { useChatQuery } from '../hooks';
import {
	Virtuoso,
	VirtuosoGridProps,
	VirtuosoProps,
	ListProps,
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
const List = React.forwardRef<
	HTMLDivElement,
	ListProps & { context?: Context<unknown>; className?: string }
>((props, ref) => {
	return (
		<div className={props.className} {...props} ref={ref}>
			{props.children}
		</div>
	);
});
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
				List: (innerprops) => <List {...innerprops} className={props.innerClassName} />,
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
const RowRender = React.memo((props: RowRenderProps) => {
	const itemref = React.useRef<any>();
	const [updateKey, forceUpdate] = useForceUpdate();

	const chatitem = props.item;
	const itemdata = typeof chatitem === 'object' ? chatitem.data : chatitem;
	chatitem.refreshFunction = forceUpdate;
	chatitem.itemref = itemref;

	return (
		<View ref={itemref} key={chatitem._id} id={'msg-' + chatitem._id}>
			<props.ItemRender
				itemref={itemref}
				chatitem={chatitem}
				item={itemdata}
				nextitem={chatitem.nextitem?.data}
				previtem={chatitem.previtem?.data}
				itemProps={props.itemProps}
			/>
		</View>
	);
});

export type ItemRenderProps = {
	chatitem: ChatItem;
	item: ItemData;
	nextitem: ItemData;
	previtem: ItemData;
	itemref: any;
	itemProps: ItemPropsType;
};

export default VirtualChatList;
