import React from 'react';
import { UIDHelper, useForceUpdate } from '../classes/HelperFunctions';
import { ChatItem, ItemData } from '../classes/ChatItem';
import ChatManager, {
	LoadFunctionType, 
} from '../classes/ChatManager';
import { useChatManager } from '../hooks/useChatManager';
import {
	QueryClient,
	QueryClientProvider, 
} from '@tanstack/react-query';
import { View } from 'react-native';

import { useChatQuery } from '../hooks';
import { useLoadOnScroll } from '../hooks/useLoadOnScroll';
import ScrollViewMVCP from './FlatListMVCP';
/* -------------------------------------------------------------------------- */
type ItemPropsType = any;
type VirtualScrollerProps = {
	loadFunction: LoadFunctionType;
	ItemRender: React.ElementType<ItemRenderProps>;
	/* -------------------------------------------------------------------------- */
	newItems?: ItemData[];
	WrapperContent?: React.ElementType<any>;
	BottomContent?: React.ElementType<any>;
	TopContent?: React.ElementType<any>;
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
	const [queryClient] = React.useState(new QueryClient());
	return (
		<QueryClientProvider client={queryClient}>
			<VirtualChatListInner {...props} />
		</QueryClientProvider>
	);
}

/**
 * Advanced Virtual scrolling
 * use the debug prop to enable logs
 * @param props
 */
function VirtualChatListInner(props: VirtualScrollerProps) {
	const chatManager = useChatManager({
		managerRef: props.managerRef,
		loadFunction: props.loadFunction,
		debug: props.debug,
	});
	const { currentItems } = useChatQuery({
		chatManager: chatManager,
	});
	const { onScroll } = useLoadOnScroll({
		chatManager: chatManager,
	});

	return (
		<ScrollViewMVCP
			chatManager={chatManager}
			onScroll={onScroll}
			/* -------------------------------------------------------------------------- */
			style={{ height: '100%', width: '100%' }}
			data={currentItems}
			renderItem={({ item }) => (
				<RowRender
					item={item}
					itemProps={props.itemProps}
					ItemRender={props.ItemRender}
				/>
			)}
			keyExtractor={(item: ChatItem) => item.key}
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
