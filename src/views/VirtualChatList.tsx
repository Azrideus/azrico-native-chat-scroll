import React, { DOMAttributes } from 'react';
import { ChatItem, ItemData } from '../classes/ChatItem';
import ChatManager, { LoadFunctionType } from '../classes/ChatManager';
import { useChatManager } from '../hooks/useChatManager';

import { useChatQuery } from '../hooks';
import { TableVirtuoso, TableVirtuosoProps } from '@azrico/react-virtuoso';
import { Table, VirtualItem } from './VirtualItem';

/* -------------------------------------------------------------------------- */
type ItemPropsType = any;
type VirtualScrollerProps<T> = {
	loadFunction: LoadFunctionType<T>;
	ItemRender: React.ElementType<ItemRenderProps>;
	/* -------------------------------------------------------------------------- */
	gridProps?: TableVirtuosoProps<any, any>;
	/**
	 * this is passed to render of every item
	 */
	itemProps?: ItemPropsType;
	/**
	 * this is used in render of each row
	 */
	rowProps?: DOMAttributes<any>;
	/* -------------------------------------------------------------------------- */
	newItems?: ItemData[];
	WrapperContent?: React.ComponentType<any>;
	BottomContent?: React.ComponentType<any>;
	TopContent?: React.ComponentType<any>;

	/* -------------------------------------------------------------------------- */
	managerRef?: React.MutableRefObject<ChatManager<T> | undefined>;
	className?: string;
	itemClassName?: string;
	innerClassName?: string;
	listClassName?: string;
	/* -------------------------------------------------------------------------- */
	onRowDoubleClick?: (ref, data: ItemData) => any;
	onRowClick?: (ref, data: ItemData) => any;

	debug?: boolean;
};

/**
 * Advanced Virtual scrolling
 * use the debug prop to enable logs
 * @param props
 */
function VirtualChatList<T>(props: VirtualScrollerProps<T>) {
	return <VirtualChatListInner {...props} />;
}

/* -------------------------------------------------------------------------- */

/**
 * Advanced Virtual scrolling
 * use the debug prop to enable logs
 * @param props
 */
function VirtualChatListInner<T>(props: VirtualScrollerProps<T>) {
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

	const root_components = React.useMemo(() => {
		const comps = props.gridProps?.components ?? {};
		const res = {
			...comps,
			Table: Table({
				className: props.listClassName || props.innerClassName,
				component: comps?.Table,
			}) as any,
			TableRow: VirtualItem({
				customProps: props.rowProps,
				component: comps?.TableRow,
				onDoubleClick: props.onRowDoubleClick,
				onClick: props.onRowClick,
			}) as any,
		};
		return res;
	}, [props.listClassName, props.innerClassName]);
	const wrapper_components = React.useMemo(() => {
		const wrapperRender = props.WrapperContent;
		const topRender = props.TopContent;
		const botRender = props.BottomContent;
		const res = {
			TableFoot: isAtVeryBottom ? botRender : wrapperRender,
			TableHead: isAtVeryTop ? topRender : wrapperRender,
		};
		return res;
	}, [
		isAtVeryBottom,
		isAtVeryTop,
		props.TopContent,
		props.BottomContent,
		props.WrapperContent,
	]);
	const style = React.useMemo(() => {
		return { height: '100%', width: '100%', overflowX: 'clip' } as any;
	}, []);
	return (
		<TableVirtuoso
			{...props.gridProps}
			className={props.className}
			components={{ ...root_components, ...wrapper_components }}
			/* -------------------------------------------------------------------------- */
			alignToBottom={true}
			followOutput="smooth"
			ref={listRef}
			onScroll={onScroll}
			style={style}
			firstItemIndex={firstItemIndex}
			initialTopMostItemIndex={initialTopMostItemIndex}
			/* ---------------------------------S----------------------------------------- */
			data={currentItems}
			startReached={startReached}
			endReached={endReached}
			itemContent={(index, chatitem) => {
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
			}}
		/>
	);
}

export type ItemRenderProps = {
	chatitem: ChatItem<any>;
	item: ItemData;
	nextitem: ItemData;
	previtem: ItemData;
	itemref: any;
	itemProps: ItemPropsType;
};

export default React.memo(VirtualChatList);
